package com.floatingbuddy.ai

import android.animation.ValueAnimator
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
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.Typeface
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
import android.view.View
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * SlimeView
 * Custom native View that draws the animated slime companion:
 * - Dynamic squish, idle breathing oscillation, and bounce physics
 * - Floor shadow oval with variable alpha
 * - 5 distinct mood expressions (0: Happy, 1: Sleepy Zzz, 2: Angry/Dizzy, 3: In Love, 4: Yummy/Nom)
 * - Custom speech bubble with directional tail
 */
class SlimeView(context: Context) : View(context) {
    var squish = 0f
    var bounce = 0f
    var mood = 0
        set(v) { field = v % 5; invalidate() }
    var message: String? = null
    var scale = 1f

    private val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#5DADE2") }
    private val bodyDarkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#2E86C1") }
    private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; alpha = 150 }
    private val eyePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK }
    private val eyeWhitePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    private val blushPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F1948A"); alpha = 120 }
    private val bubblePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        setShadowLayer(10f, 0f, 4f, Color.parseColor("#94A3B8"))
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.BLACK
        textSize = 34f
        typeface = Typeface.DEFAULT_BOLD
        textAlign = Paint.Align.CENTER
    }
    private val rect = RectF()

    fun bounceAnim() {
        ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 500
            addUpdateListener {
                val frac = it.animatedFraction
                bounce = sin(frac * Math.PI).toFloat() * 35f
                squish = sin(frac * Math.PI).toFloat() * 0.35f
                invalidate()
            }
            start()
        }
    }

    fun say(text: String, durationMs: Long = 4000) {
        message = text
        invalidate()
        removeCallbacks(dismissBubbleRunnable)
        postDelayed(dismissBubbleRunnable, durationMs)
    }

    private val dismissBubbleRunnable = Runnable {
        message = null
        invalidate()
    }

    fun startIdle() {
        ValueAnimator.ofFloat(0f, 360f).apply {
            duration = 2000
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener {
                val deg = it.animatedValue as Float
                squish = sin(Math.toRadians(deg.toDouble())).toFloat() * 0.05f
                invalidate()
            }
            start()
        }
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        val cx = w / 2f
        val cy = h / 2f + bounce

        canvas.save()
        canvas.scale(scale, scale, cx, cy)

        // 1. Floor shadow under slime
        bodyDarkPaint.alpha = 70
        rect.set(cx - w * 0.4f, cy + h * 0.3f, cx + w * 0.4f, cy + h * 0.45f)
        canvas.drawOval(rect, bodyDarkPaint)
        bodyDarkPaint.alpha = 255

        // 2. Organic squishy slime body
        val squishH = 1f - squish
        val squishW = 1f + squish
        rect.set(
            cx - w * 0.42f * squishW,
            cy - h * 0.32f * squishH,
            cx + w * 0.42f * squishW,
            cy + h * 0.36f * squishH
        )
        canvas.drawOval(rect, bodyPaint)

        // 3. Specular gloss highlight reflection
        rect.set(cx - w * 0.28f, cy - h * 0.25f, cx - w * 0.05f, cy - h * 0.05f)
        canvas.drawOval(rect, highlightPaint)

        val eyeY = cy - h * 0.05f
        val leftEyeX = cx - w * 0.16f
        val rightEyeX = cx + w * 0.16f

        // 4. Mood expressions (0: Normal Happy, 1: Sleepy Zzz, 2: Angry/Dizzy, 3: In Love, 4: Yummy)
        when (mood) {
            0 -> {
                // Happy big eyes and smile
                canvas.drawCircle(leftEyeX, eyeY, w * 0.07f, eyeWhitePaint)
                canvas.drawCircle(leftEyeX, eyeY, w * 0.035f, eyePaint)
                canvas.drawCircle(rightEyeX, eyeY, w * 0.07f, eyeWhitePaint)
                canvas.drawCircle(rightEyeX, eyeY, w * 0.035f, eyePaint)

                val sp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.BLACK
                    style = Paint.Style.STROKE
                    strokeWidth = w * 0.022f
                    strokeCap = Paint.Cap.ROUND
                }
                val sr = RectF(cx - w * 0.12f, eyeY + h * 0.05f, cx + w * 0.12f, eyeY + h * 0.18f)
                canvas.drawArc(sr, 20f, 140f, false, sp)
            }
            1 -> {
                // Sleepy straight eye lines and floating Z z
                val lp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.BLACK
                    style = Paint.Style.STROKE
                    strokeWidth = w * 0.022f
                    strokeCap = Paint.Cap.ROUND
                }
                canvas.drawLine(leftEyeX - w * 0.06f, eyeY, leftEyeX + w * 0.06f, eyeY, lp)
                canvas.drawLine(rightEyeX - w * 0.06f, eyeY, rightEyeX + w * 0.06f, eyeY, lp)

                val zp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.BLACK
                    textSize = w * 0.12f
                    typeface = Typeface.DEFAULT_BOLD
                }
                canvas.drawText("Z", cx + w * 0.25f, eyeY - h * 0.15f, zp)
                canvas.drawText("z", cx + w * 0.32f, eyeY - h * 0.25f, zp)
            }
            2 -> {
                // Angry / Dizzy eyebrows, downward pupils, flat stern mouth
                canvas.drawCircle(leftEyeX, eyeY, w * 0.07f, eyeWhitePaint)
                canvas.drawCircle(leftEyeX, eyeY + h * 0.02f, w * 0.04f, eyePaint)
                canvas.drawCircle(rightEyeX, eyeY, w * 0.07f, eyeWhitePaint)
                canvas.drawCircle(rightEyeX, eyeY + h * 0.02f, w * 0.04f, eyePaint)

                val ap = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.BLACK
                    style = Paint.Style.STROKE
                    strokeWidth = w * 0.025f
                }
                canvas.drawLine(leftEyeX - w * 0.08f, eyeY - h * 0.08f, leftEyeX + w * 0.08f, eyeY - h * 0.03f, ap)
                canvas.drawLine(rightEyeX - w * 0.08f, eyeY - h * 0.03f, rightEyeX + w * 0.08f, eyeY - h * 0.08f, ap)
                canvas.drawLine(cx - w * 0.1f, eyeY + h * 0.15f, cx + w * 0.1f, eyeY + h * 0.15f, ap)
            }
            3 -> {
                // In Love / Excited hearts & blushing
                eyePaint.color = Color.parseColor("#E74C3C")
                canvas.drawCircle(leftEyeX, eyeY, w * 0.05f, eyePaint)
                canvas.drawCircle(rightEyeX, eyeY, w * 0.05f, eyePaint)
                eyePaint.color = Color.BLACK

                canvas.drawCircle(cx - w * 0.06f, eyeY + h * 0.15f, w * 0.05f, blushPaint)
                canvas.drawCircle(cx + w * 0.06f, eyeY + h * 0.15f, w * 0.05f, blushPaint)

                val hp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.BLACK
                    style = Paint.Style.STROKE
                    strokeWidth = w * 0.02f
                }
                val sr = RectF(cx - w * 0.08f, eyeY + h * 0.06f, cx + w * 0.08f, eyeY + h * 0.14f)
                canvas.drawArc(sr, 20f, 140f, false, hp)
            }
            4 -> {
                // Yummy / Nom Nom open mouth with pink tongue
                canvas.drawCircle(leftEyeX, eyeY, w * 0.07f, eyeWhitePaint)
                canvas.drawCircle(rightEyeX, eyeY, w * 0.07f, eyeWhitePaint)
                canvas.drawCircle(leftEyeX, eyeY - h * 0.02f, w * 0.03f, eyePaint)
                canvas.drawCircle(rightEyeX, eyeY - h * 0.02f, w * 0.03f, eyePaint)

                val mp = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK }
                canvas.drawOval(RectF(cx - w * 0.12f, eyeY + h * 0.05f, cx + w * 0.12f, eyeY + h * 0.22f), mp)

                val tp = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F1948A") }
                canvas.drawOval(RectF(cx - w * 0.05f, eyeY + h * 0.12f, cx + w * 0.05f, eyeY + h * 0.20f), tp)
            }
        }

        // Cheeks (for all moods except sleepy)
        if (mood != 1) {
            canvas.drawCircle(cx - w * 0.22f, eyeY + h * 0.12f, w * 0.05f, blushPaint)
            canvas.drawCircle(cx + w * 0.22f, eyeY + h * 0.12f, w * 0.05f, blushPaint)
        }

        // 5. Speech Bubble with Tail
        message?.let { msg ->
            val bw = (textPaint.measureText(msg) + 50f).coerceAtLeast(140f)
            val bh = 76f
            val bx = cx
            val by = cy - h * 0.65f

            rect.set(bx - bw / 2f, by - bh / 2f, bx + bw / 2f, by + bh / 2f)
            canvas.drawRoundRect(rect, 25f, 25f, bubblePaint)

            // Tail
            val path = Path().apply {
                moveTo(bx, by + bh / 2f)
                lineTo(bx - 15f, by + bh / 2f + 20f)
                lineTo(bx + 15f, by + bh / 2f)
                close()
            }
            canvas.drawPath(path, bubblePaint)
            canvas.drawText(msg, bx, by + 12f, textPaint)
        }

        canvas.restore()
    }

    init {
        startIdle()
        setLayerType(LAYER_TYPE_SOFTWARE, null)
    }
}

/**
 * FloatingService
 * Hosts the Slime overlay, handles sensors (accelerometer shake, battery status, night time, idle timer),
 * dragging, double tap screen capture, and OpenRouter AI integration.
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

    // Time checker: night sleepiness
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

        // Hardware sensor setup
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

        setupTouchEvents()

        windowManager?.addView(floatingView, params)
        floatingView?.postDelayed({ floatingView?.say("I'm alive! 🧠") }, 900)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
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
            v.mood = (v.mood + 1) % 5
            v.bounceAnim()
            val msgs = when (v.mood) {
                0 -> listOf("Hehe! 😊", "Squish squish!")
                1 -> listOf("Zzz... 😴", "Sleepy...")
                2 -> listOf("Grrr! 😠", "Don't poke me!")
                3 -> listOf("Love you! 🥰", "My hero! <3")
                4 -> listOf("Nom nom! 😋", "Yummy!")
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
            val prompt = "My mood is ${floatingView?.mood}, Hunger: ${stats.hunger}%. Say something cheeky and cute!"
            val reply = OpenRouterClient.chat(this@FloatingService, prompt)
            withContext(Dispatchers.Main) {
                floatingView?.say(reply, 5000)
            }
        }
    }

    private fun onDoubleTapped() {
        floatingView?.mood = 3
        floatingView?.bounceAnim()
        floatingView?.say("Looking at your screen... 👁️", 3000)

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
                    "I just double-tapped you! Describe how much fun we are having!"
                )
            }

            withContext(Dispatchers.Main) {
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
                    floatingView?.mood = 2
                    floatingView?.say(listOf("Stop shaking me!! 🤢", "I'm dizzy! 😵💫", "Noooo!").random())
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
            .setContentText("He feels battery, time, shakes, and speaks OpenRouter AI!")
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
    }
}
