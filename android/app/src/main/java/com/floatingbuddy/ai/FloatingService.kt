package com.floatingbuddy.ai

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar
import kotlin.math.sqrt
import kotlin.random.Random

/**
 * FloatingService
 * Foreground service hosting the floating slime overlay:
 * - Hosts SlimeView as a TYPE_APPLICATION_OVERLAY window
 * - Schedules spontaneous Dance Mode at random intervals (every 45-75 seconds)
 * - Implements rich mood logic: Happy, Sleepy, Angry/Dizzy, In Love, Nom Nom, and Confused
 * - Responds to hardware gestures: shake detection, battery state, day/night cycles
 * - Connects to OpenRouter AI via OpenRouterClient with Gemini 1.5 Flash
 */
class FloatingService : Service(), SensorEventListener {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var windowManager: WindowManager? = null
    private var floatingView: SlimeView? = null
    private var params: WindowManager.LayoutParams? = null

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var moved = false
    private var lastTapTime = 0L
    private var lastInteraction = System.currentTimeMillis()

    private var sensorManager: SensorManager? = null
    private var lastShake = 0L

    private val handler = Handler(Looper.getMainLooper())
    private var stats = SlimeStats()

    private var screenshotHelper: ScreenshotHelper? = null
    private var mediaProjection: MediaProjection? = null

    // Dance Mode Timer: triggers dancing spontaneously at random intervals between 45s and 75s
    private val danceRunnable = object : Runnable {
        override fun run() {
            val idleFor = System.currentTimeMillis() - lastInteraction
            // Only spontaneously burst into dance if not asleep and battery isn't depleted
            if (floatingView?.mood != 1 && floatingView?.mood != 2 && idleFor < 300000) {
                floatingView?.danceAnim(4500)
            }
            val nextDelay = 45000L + Random.nextLong(30000L)
            handler.postDelayed(this, nextDelay)
        }
    }

    // Idle timer: prompts user if unattended for 2 minutes
    private val idleRunnable = object : Runnable {
        override fun run() {
            val idleFor = System.currentTimeMillis() - lastInteraction
            if (idleFor > 120000) {
                floatingView?.say(listOf("Hey! 😢", "Play with me!", "I'm lonely...", "Tap me!").random())
                floatingView?.mood = 0
                floatingView?.bounceAnim()
            }
            handler.postDelayed(this, 120000)
        }
    }

    // Time checker: night sleepiness (10 PM to 5 AM)
    private val timeRunnable = object : Runnable {
        override fun run() {
            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            if (hour in 22..23 || hour in 0..5) {
                if (floatingView?.mood != 1) {
                    floatingView?.mood = 1
                    floatingView?.say("Go sleep! 🌙")
                }
            }
            handler.postDelayed(this, 60000)
        }
    }

    // Battery & Charging broadcast receiver
    private val batteryReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
            if (intent == null) return
            when (intent.action) {
                Intent.ACTION_BATTERY_CHANGED -> {
                    val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                    val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                    if (scale > 0) {
                        val pct = level * 100 / scale
                        if (pct < 15) {
                            floatingView?.mood = 1
                            floatingView?.say("I'm tired... 🔋 $pct%")
                        }
                    }
                }
                Intent.ACTION_POWER_CONNECTED -> {
                    stats.rest(25)
                    floatingView?.mood = 3
                    floatingView?.say("Yummy energy! ⚡")
                    floatingView?.bounceAnim()
                    floatingView?.scale = 1.25f
                    floatingView?.postDelayed({ floatingView?.scale = 1f }, 800)
                }
                Intent.ACTION_POWER_DISCONNECTED -> {
                    floatingView?.say("Nooo energy! 😭")
                    floatingView?.mood = 2
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        stats = SlimeStats.load(this)
        startForegroundNotification()

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        floatingView = SlimeView(this)

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        params = WindowManager.LayoutParams(
            320,
            320,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 180
            y = 350
        }

        // Hardware accelerometer setup
        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        sensorManager?.registerListener(
            this,
            sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER),
            SensorManager.SENSOR_DELAY_UI
        )

        // Battery receivers
        registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_POWER_CONNECTED))
        registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_POWER_DISCONNECTED))

        handler.post(idleRunnable)
        handler.post(timeRunnable)
        handler.postDelayed(danceRunnable, 30000)

        setupTouchEvents()

        windowManager?.addView(floatingView, params)
        floatingView?.postDelayed({ floatingView?.say("I'm alive! 🧠") }, 900)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_TRIGGER_DANCE -> {
                floatingView?.danceAnim(4500)
                return START_STICKY
            }
            ACTION_TRIGGER_CONFUSED -> {
                floatingView?.confusedAnim()
                return START_STICKY
            }
        }

        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, 0) ?: 0
        val resultData: Intent? = intent?.getParcelableExtra(EXTRA_RESULT_DATA)

        if (resultCode != 0 && resultData != null && mediaProjection == null) {
            val mpManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            mediaProjection = mpManager.getMediaProjection(resultCode, resultData)
            mediaProjection?.let {
                screenshotHelper = ScreenshotHelper(this, it)
            }
        }
        return START_STICKY
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupTouchEvents() {
        var longPressTriggered = false
        val longPressRunnable = Runnable {
            longPressTriggered = true
            stats.feed(20)
            SlimeStats.save(this, stats)
            floatingView?.mood = 4
            floatingView?.say("THANK YOU! 🍔")
            floatingView?.bounceAnim()
            floatingView?.scale = 1.35f
            floatingView?.postDelayed({ floatingView?.scale = 1f }, 600)
            lastInteraction = System.currentTimeMillis()
        }

        floatingView?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params!!.x
                    initialY = params!!.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    moved = false
                    longPressTriggered = false
                    lastInteraction = System.currentTimeMillis()
                    handler.postDelayed(longPressRunnable, 550)
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (dx * dx + dy * dy > 80) {
                        moved = true
                        handler.removeCallbacks(longPressRunnable)
                    }
                    if (moved) {
                        params!!.x = initialX + dx
                        params!!.y = initialY + dy
                        windowManager?.updateViewLayout(floatingView, params)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    handler.removeCallbacks(longPressRunnable)
                    if (!moved && !longPressTriggered) {
                        val now = System.currentTimeMillis()
                        if (now - lastTapTime < 320) {
                            // Double tap: Screen vision or AI chat
                            onDoubleTapped()
                        } else {
                            // Single tap: Bounce & cycle mood / AI greeting
                            onSingleTapped()
                        }
                        lastTapTime = now
                    } else if (moved) {
                        floatingView?.bounceAnim()
                    }
                    true
                }
                MotionEvent.ACTION_CANCEL -> {
                    handler.removeCallbacks(longPressRunnable)
                    false
                }
                else -> false
            }
        }
    }

    private fun onSingleTapped() {
        floatingView?.let { v ->
            // Cycle through all 6 moods (including Confused mood 5!)
            v.mood = (v.mood + 1) % 6
            v.bounceAnim()
            val msgs = when (v.mood) {
                0 -> listOf("Hehe! 😊", "Squish squish!")
                1 -> listOf("Zzz... 😴", "Sleepy...")
                2 -> listOf("Grrr! 😠", "Don't poke me!")
                3 -> listOf("Love you! 🥰", "My hero! <3")
                4 -> listOf("Nom nom! 😋", "Yummy!")
                5 -> listOf("Huh? 🤔", "Wait, what?", "Does not compute! 🧩", "Bloop?")
                else -> listOf("Hi!")
            }
            v.say(msgs.random())

            if (v.mood == 4) {
                v.scale = 1.25f
                v.postDelayed({ v.scale = 1f }, 1000)
            }
        }

        // Query OpenRouter AI companion
        serviceScope.launch {
            val moodName = when (floatingView?.mood) {
                0 -> "Happy"
                1 -> "Sleepy"
                2 -> "Grumpy"
                3 -> "In Love"
                4 -> "Eating"
                5 -> "Puzzled / Confused"
                else -> "Curious"
            }
            val prompt = "My mood is $moodName, Hunger: ${stats.hunger}%. Say something quirky and cute matching this exact mood!"
            val reply = OpenRouterClient.chat(this@FloatingService, prompt)
            withContext(Dispatchers.Main) {
                floatingView?.say(reply, 5000)
            }
        }
    }

    private fun onDoubleTapped() {
        // Confused / Inquisitive state while inspecting screen
        floatingView?.confusedAnim()
        floatingView?.say("Looking closely at your screen... 🔍", 3000)

        serviceScope.launch {
            val helper = screenshotHelper
            val base64 = helper?.captureScreenAsBase64()

            val reply = if (!base64.isNullOrBlank()) {
                OpenRouterClient.chat(
                    this@FloatingService,
                    "What do you see on my screen? Describe in 2 sentences.",
                    base64
                )
            } else {
                OpenRouterClient.chat(
                    this@FloatingService,
                    "I just double-tapped you! React with curious wonder!"
                )
            }

            withContext(Dispatchers.Main) {
                floatingView?.mood = 0
                floatingView?.say(reply, 6000)
            }
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            val gForce = sqrt(x * x + y * y + z * z) / SensorManager.GRAVITY_EARTH
            if (gForce > 2.5f) {
                val now = System.currentTimeMillis()
                if (now - lastShake > 1500) {
                    lastShake = now
                    // Alternate between dizzy angry and puzzled confused
                    if (Random.nextBoolean()) {
                        floatingView?.mood = 2
                        floatingView?.say(listOf("Stop shaking me!! 🤢", "I'm dizzy! 😵💫").random())
                    } else {
                        floatingView?.confusedAnim()
                    }
                    floatingView?.bounceAnim()
                    lastInteraction = now
                }
            }
        }
    }

    override fun onAccuracyChanged(s: Sensor?, a: Int) {}

    private fun startForegroundNotification() {
        val channelId = "floating_pet_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Smart Slime",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val openIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Smart Slime is alive 🧠💧")
            .setContentText("He feels battery, time, shakes, dances, and speaks OpenRouter AI!")
            .setSmallIcon(android.R.drawable.star_big_on)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        try { unregisterReceiver(batteryReceiver) } catch (e: Exception) {}
        sensorManager?.unregisterListener(this)
        handler.removeCallbacks(idleRunnable)
        handler.removeCallbacks(timeRunnable)
        handler.removeCallbacks(danceRunnable)
        try {
            floatingView?.let { windowManager?.removeView(it) }
        } catch (e: Exception) {}
        screenshotHelper?.release()
        mediaProjection?.stop()
    }

    companion object {
        const val NOTIFICATION_ID = 1
        const val EXTRA_RESULT_CODE = "extra_result_code"
        const val EXTRA_RESULT_DATA = "extra_result_data"

        const val ACTION_TRIGGER_DANCE = "com.floatingbuddy.ai.ACTION_DANCE"
        const val ACTION_TRIGGER_CONFUSED = "com.floatingbuddy.ai.ACTION_CONFUSED"
    }
}
