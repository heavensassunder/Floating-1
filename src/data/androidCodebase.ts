import { CodeFile } from '../types';

export const ANDROID_CODEBASE: CodeFile[] = [
  {
    name: 'OpenRouterClient.kt',
    path: 'app/src/main/java/com/floatingbuddy/ai/OpenRouterClient.kt',
    language: 'kotlin',
    category: 'Kotlin',
    description: 'Makes POST calls to OpenRouter AI with OkHttp3, supports text & base64 vision using google/gemini-flash-1.5',
    content: `package com.floatingbuddy.ai

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * OpenRouterClient
 * Communicates with OpenRouter AI chat completions endpoint.
 * Supports text and multimodal image base64 queries using Google Gemini Flash 1.5.
 */
object OpenRouterClient {
    private const val BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
    private const val MODEL_NAME = "google/gemini-flash-1.5"
    private const val PREFS_NAME = "slime_stats"
    private const val PREF_KEY_API = "openrouter_api_key"

    private const val SYSTEM_PROMPT =
        "You are Slime, a cute floating buddy, playful, cheeky, helpful. Max 2 sentences. Keep it cute and short."

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(25, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(25, TimeUnit.SECONDS)
        .build()

    /**
     * Retrieve the user configured API key from SharedPreferences
     */
    fun getApiKey(context: Context): String {
        val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(PREF_KEY_API, "") ?: ""
    }

    /**
     * Save OpenRouter API key to SharedPreferences
     */
    fun saveApiKey(context: Context, key: String) {
        val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(PREF_KEY_API, key.trim()).apply()
    }

    /**
     * Send chat request to OpenRouter.
     * @param context Application context for reading SharedPreferences
     * @param userText Prompt or message from user/slime event
     * @param imageBase64 Optional raw base64 string for vision analysis
     * @return AI reply string or helpful error message
     */
    suspend fun chat(
        context: Context,
        userText: String,
        imageBase64: String? = null
    ): String = withContext(Dispatchers.IO) {
        val apiKey = getApiKey(context)
        if (apiKey.isBlank()) {
            return@withContext "Squish! Please enter your OpenRouter API Key in the Floating Buddy app first!"
        }

        try {
            val rootJson = JSONObject()
            rootJson.put("model", MODEL_NAME)

            val messagesArray = JSONArray()

            // 1. System Prompt
            val systemMessage = JSONObject()
            systemMessage.put("role", "system")
            systemMessage.put("content", SYSTEM_PROMPT)
            messagesArray.put(systemMessage)

            // 2. User Message (Text or Vision)
            val userMessage = JSONObject()
            userMessage.put("role", "user")

            if (imageBase64.isNullOrBlank()) {
                // Text-only content
                userMessage.put("content", userText)
            } else {
                // Multimodal content array
                val contentArray = JSONArray()

                // Text part
                val textObj = JSONObject()
                textObj.put("type", "text")
                textObj.put("text", userText)
                contentArray.put(textObj)

                // Vision part
                val imageObj = JSONObject()
                imageObj.put("type", "image_url")
                val imageUrlObj = JSONObject()
                imageUrlObj.put("url", "data:image/jpeg;base64,$imageBase64")
                imageObj.put("image_url", imageUrlObj)
                contentArray.put(imageObj)

                userMessage.put("content", contentArray)
            }

            messagesArray.put(userMessage)
            rootJson.put("messages", messagesArray)
            rootJson.put("max_tokens", 150)
            rootJson.put("temperature", 0.7)

            val requestBody = rootJson.toString().toRequestBody(JSON_MEDIA_TYPE)

            val request = Request.Builder()
                .url(BASE_URL)
                .addHeader("Authorization", "Bearer $apiKey")
                .addHeader("Content-Type", "application/json")
                .addHeader("HTTP-Referer", "https://github.com/floatingbuddy/ai")
                .addHeader("X-Title", "Floating Buddy AI")
                .post(requestBody)
                .build()

            val response = okHttpClient.newCall(request).execute()
            val responseBody = response.body?.string().orEmpty()

            if (!response.isSuccessful) {
                return@withContext try {
                    val errJson = JSONObject(responseBody)
                    val errorObj = errJson.optJSONObject("error")
                    val msg = errorObj?.optString("message") ?: response.message
                    "Bloop error (\${response.code}): $msg"
                } catch (e: Exception) {
                    "Bloop error: HTTP \${response.code} \${response.message}"
                }
            }

            val parsedJson = JSONObject(responseBody)
            val choices = parsedJson.optJSONArray("choices")
            if (choices != null && choices.length() > 0) {
                val firstChoice = choices.getJSONObject(0)
                val message = firstChoice.optJSONObject("message")
                val reply = message?.optString("content")?.trim() ?: "Squish squish! *happy bop*"
                return@withContext reply
            }

            return@withContext "Squish? I heard you, but my slime brain was empty!"
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext "Slime hiccup: \${e.localizedMessage ?: "Connection error"}"
        }
    }
}`
  },
  {
    name: 'SlimeStats.kt',
    path: 'app/src/main/java/com/floatingbuddy/ai/SlimeStats.kt',
    language: 'kotlin',
    category: 'Kotlin',
    description: 'Slime stats data class, SharedPreferences JSON persistence, background ticking, and care actions',
    content: `package com.floatingbuddy.ai

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson

/**
 * SlimeStats
 * Represents the health, hunger, happiness, and energy of the Slime.
 * Handles background ticking and persistence in SharedPreferences.
 */
data class SlimeStats(
    var hunger: Int = 100,
    var happiness: Int = 100,
    var energy: Int = 100,
    var lastFed: Long = System.currentTimeMillis()
) {
    /**
     * Ticks the slime stats based on elapsed time.
     * Hunger drops 1 point every 5 minutes (300,000 ms).
     * If hunger < 30, happiness also starts decreasing.
     */
    fun tick(currentTimeMillis: Long = System.currentTimeMillis()): Boolean {
        var changed = false
        val elapsed = currentTimeMillis - lastFed

        val fiveMinutes = 5 * 60 * 1000L
        if (elapsed >= fiveMinutes) {
            val intervals = (elapsed / fiveMinutes).toInt()
            if (intervals > 0) {
                val hungerDrop = intervals
                val oldHunger = hunger
                hunger = (hunger - hungerDrop).coerceIn(0, 100)

                // If hungry (< 30), happiness drops as well
                if (hunger < 30) {
                    val happinessDrop = (intervals * 1.5).toInt()
                    happiness = (happiness - happinessDrop).coerceIn(0, 100)
                }

                // Passive energy recovery/decay
                if (hunger < 20) {
                    energy = (energy - 1).coerceIn(0, 100)
                }

                // Advance lastFed counter by accounted intervals
                lastFed += intervals * fiveMinutes
                changed = true
            }
        }
        return changed
    }

    /**
     * Feed the slime to increase hunger and slight happiness
     */
    fun feed(amount: Int = 20) {
        hunger = (hunger + amount).coerceIn(0, 100)
        happiness = (happiness + (amount / 2)).coerceIn(0, 100)
        lastFed = System.currentTimeMillis()
    }

    /**
     * Play with the slime to boost happiness, costs some energy
     */
    fun play(amount: Int = 15) {
        if (energy >= 10) {
            happiness = (happiness + amount).coerceIn(0, 100)
            energy = (energy - 10).coerceIn(0, 100)
            hunger = (hunger - 5).coerceIn(0, 100)
        }
    }

    /**
     * Rest the slime to restore energy
     */
    fun rest(amount: Int = 20) {
        energy = (energy + amount).coerceIn(0, 100)
    }

    /**
     * Mood status string based on hunger and happiness
     */
    fun getMood(): SlimeMood {
        return when {
            hunger > 70 -> SlimeMood.HAPPY
            hunger in 30..70 -> SlimeMood.NEUTRAL
            else -> SlimeMood.SAD
        }
    }

    enum class SlimeMood {
        HAPPY,
        NEUTRAL,
        SAD
    }

    companion object {
        private const val PREFS_FILE = "slime_stats"
        private const val KEY_STATS = "stats_json"
        private val gson = Gson()

        /**
         * Load SlimeStats from SharedPreferences
         */
        fun load(context: Context): SlimeStats {
            val prefs: SharedPreferences = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_STATS, null) ?: return SlimeStats()
            return try {
                gson.fromJson(json, SlimeStats::class.java) ?: SlimeStats()
            } catch (e: Exception) {
                SlimeStats()
            }
        }

        /**
         * Save SlimeStats to SharedPreferences
         */
        fun save(context: Context, stats: SlimeStats) {
            val prefs: SharedPreferences = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
            val json = gson.toJson(stats)
            prefs.edit().putString(KEY_STATS, json).apply()
        }
    }
}`
  },
  {
    name: 'ChatBubbleView.kt',
    path: 'app/src/main/java/com/floatingbuddy/ai/ChatBubbleView.kt',
    language: 'kotlin',
    category: 'Kotlin',
    description: 'Custom overlay speech bubble, auto-positions above slime, auto-dismisses after 5s with fade',
    content: `package com.floatingbuddy.ai

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView

/**
 * ChatBubbleView
 * Floating speech bubble rendered directly above the slime avatar.
 * Managed via WindowManager with TYPE_APPLICATION_OVERLAY.
 * Automatically fades out after 5 seconds.
 */
class ChatBubbleView(private val context: Context) {

    private val windowManager: WindowManager =
        context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    private val containerView: FrameLayout = FrameLayout(context)
    private val textView: TextView = TextView(context)
    private val handler = Handler(Looper.getMainLooper())

    private var isAttached = false
    private val layoutParams = WindowManager.LayoutParams().apply {
        type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        format = PixelFormat.TRANSLUCENT
        flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        gravity = Gravity.TOP or Gravity.START
        width = WindowManager.LayoutParams.WRAP_CONTENT
        height = WindowManager.LayoutParams.WRAP_CONTENT
    }

    private val dismissRunnable = Runnable {
        fadeOutAndHide()
    }

    init {
        setupViews()
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            context.resources.displayMetrics
        ).toInt()
    }

    private fun setupViews() {
        val bubblePaddingH = dpToPx(14f)
        val bubblePaddingV = dpToPx(10f)
        val cornerRadius = dpToPx(16f).toFloat()

        // Background: White rounded pill with soft border and shadow elevation
        val backgroundDrawable = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = cornerRadius
            setColor(Color.WHITE)
            setStroke(dpToPx(1.5f), Color.parseColor("#E0E7FF"))
        }

        containerView.background = backgroundDrawable
        containerView.elevation = dpToPx(8f).toFloat()
        containerView.setPadding(bubblePaddingH, bubblePaddingV, bubblePaddingH, bubblePaddingV)

        textView.setTextColor(Color.parseColor("#1E293B"))
        textView.textSize = 13.5f
        textView.maxWidth = dpToPx(240f)
        textView.setLineSpacing(dpToPx(2f).toFloat(), 1.05f)

        val textParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        )
        containerView.addView(textView, textParams)
        containerView.visibility = View.GONE
        containerView.alpha = 0f
    }

    /**
     * Display text inside speech bubble above the slime
     */
    fun showText(text: String, slimeX: Int, slimeY: Int, slimeWidth: Int = 160) {
        handler.removeCallbacks(dismissRunnable)

        textView.text = text

        // Ensure attached to WindowManager
        if (!isAttached) {
            try {
                windowManager.addView(containerView, layoutParams)
                isAttached = true
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        containerView.measure(
            View.MeasureSpec.makeMeasureSpec(dpToPx(250f), View.MeasureSpec.AT_MOST),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        )

        val bubbleW = containerView.measuredWidth
        val bubbleH = containerView.measuredHeight

        // Position bubble centered horizontally over the slime and above its top edge
        val bubbleX = (slimeX + (slimeWidth / 2)) - (bubbleW / 2)
        val bubbleY = (slimeY - bubbleH - dpToPx(12f)).coerceAtLeast(dpToPx(24f))

        layoutParams.x = bubbleX.coerceAtLeast(dpToPx(8f))
        layoutParams.y = bubbleY

        try {
            windowManager.updateViewLayout(containerView, layoutParams)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Pop in animation
        containerView.visibility = View.VISIBLE
        containerView.scaleX = 0.85f
        containerView.scaleY = 0.85f
        containerView.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(220)
            .setListener(null)
            .start()

        // Auto-dismiss after 5 seconds
        handler.postDelayed(dismissRunnable, 5000)
    }

    /**
     * Update position dynamically while dragging the slime
     */
    fun updatePosition(slimeX: Int, slimeY: Int, slimeWidth: Int = 160) {
        if (!isAttached || containerView.visibility != View.VISIBLE) return

        val bubbleW = containerView.measuredWidth
        val bubbleH = containerView.measuredHeight
        val bubbleX = (slimeX + (slimeWidth / 2)) - (bubbleW / 2)
        val bubbleY = (slimeY - bubbleH - dpToPx(12f)).coerceAtLeast(dpToPx(24f))

        layoutParams.x = bubbleX.coerceAtLeast(dpToPx(8f))
        layoutParams.y = bubbleY

        try {
            windowManager.updateViewLayout(containerView, layoutParams)
        } catch (e: Exception) {
            // view may be in transition
        }
    }

    /**
     * Fades the bubble out and hides it
     */
    fun fadeOutAndHide() {
        if (!isAttached) return

        containerView.animate()
            .alpha(0f)
            .scaleX(0.85f)
            .scaleY(0.85f)
            .setDuration(260)
            .setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    containerView.visibility = View.GONE
                }
            })
            .start()
    }

    /**
     * Detach view from window when service is destroyed
     */
    fun destroy() {
        handler.removeCallbacks(dismissRunnable)
        if (isAttached) {
            try {
                windowManager.removeView(containerView)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isAttached = false
        }
    }
}`
  },
  {
    name: 'ScreenshotHelper.kt',
    path: 'app/src/main/java/com/floatingbuddy/ai/ScreenshotHelper.kt',
    language: 'kotlin',
    category: 'Kotlin',
    description: 'Captures screen using MediaProjection API, converts Image to Bitmap, compresses to Base64',
    content: `package com.floatingbuddy.ai

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.DisplayMetrics
import android.view.WindowManager
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

/**
 * ScreenshotHelper
 * Captures screen frames using Android MediaProjection API and ImageReader.
 * Converts raw Image buffer into compressed Bitmap and Base64 string for OpenRouter Vision API.
 */
class ScreenshotHelper(
    private val context: Context,
    private val mediaProjection: MediaProjection
) {
    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val metrics = DisplayMetrics().apply {
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getRealMetrics(this)
    }

    private val screenWidth: Int = metrics.widthPixels
    private val screenHeight: Int = metrics.heightPixels
    private val screenDensity: Int = metrics.densityDpi

    private var imageReader: ImageReader? = null
    private var virtualDisplay: VirtualDisplay? = null
    private val handler = Handler(Looper.getMainLooper())

    init {
        setupVirtualDisplay()
    }

    private fun setupVirtualDisplay() {
        // PixelFormat.RGBA_8888 for high quality screenshot capture
        imageReader = ImageReader.newInstance(
            screenWidth,
            screenHeight,
            PixelFormat.RGBA_8888,
            2
        )

        virtualDisplay = mediaProjection.createVirtualDisplay(
            "FloatingBuddyScreenCapture",
            screenWidth,
            screenHeight,
            screenDensity,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface,
            null,
            handler
        )
    }

    /**
     * Capture the current frame from ImageReader and convert it to a cropped/scaled Bitmap.
     * @return Bitmap or null if frame is not ready
     */
    fun captureScreen(): Bitmap? {
        val reader = imageReader ?: return null
        var image: Image? = null
        try {
            image = reader.acquireLatestImage() ?: reader.acquireNextImage()
            if (image == null) return null

            val planes = image.planes
            val buffer: ByteBuffer = planes[0].buffer
            val pixelStride: Int = planes[0].pixelStride
            val rowStride: Int = planes[0].rowStride
            val rowPadding: Int = rowStride - pixelStride * screenWidth

            val bitmap = Bitmap.createBitmap(
                screenWidth + rowPadding / pixelStride,
                screenHeight,
                Bitmap.Config.ARGB_8888
            )
            bitmap.copyPixelsFromBuffer(buffer)

            // Crop excess row padding if present
            val finalBitmap = if (rowPadding > 0) {
                Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
            } else {
                bitmap
            }

            return finalBitmap
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        } finally {
            image?.close()
        }
    }

    /**
     * Captures screen and converts to JPEG Base64 with resizing for fast API transmission.
     */
    fun captureScreenAsBase64(maxDimension: Int = 1024, quality: Int = 80): String? {
        val bitmap = captureScreen() ?: return null
        return try {
            val width = bitmap.width
            val height = bitmap.height

            val scale = (maxDimension.toFloat() / maxOf(width, height)).coerceAtMost(1f)
            val scaledBitmap = if (scale < 1f) {
                Bitmap.createScaledBitmap(
                    bitmap,
                    (width * scale).toInt(),
                    (height * scale).toInt(),
                    true
                )
            } else {
                bitmap
            }

            val outputStream = ByteArrayOutputStream()
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
            val byteArray = outputStream.toByteArray()
            Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Release VirtualDisplay and ImageReader
     */
    fun release() {
        try {
            virtualDisplay?.release()
            virtualDisplay = null
            imageReader?.close()
            imageReader = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}`
  },
  {
    name: 'FloatingService.kt',
    path: 'app/src/main/java/com/floatingbuddy/ai/FloatingService.kt',
    language: 'kotlin',
    category: 'Kotlin',
    description: 'Hosts animated SlimeView overlay, accelerometer shake sensor, battery broadcast receiver, night circadian sleep, idle timers, and OpenRouter AI vision',
    content: `package com.floatingbuddy.ai

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
            val prompt = "My mood is \${floatingView?.mood}, Hunger: \${stats.hunger}%. Say something cheeky and cute!"
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
}`
  },
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/floatingbuddy/ai/MainActivity.kt',
    language: 'kotlin',
    category: 'Kotlin',
    description: 'Jetpack Compose Material 3 UI with API Key configuration, live stats progress bars, overlay & media projection requests',
    content: `package com.floatingbuddy.ai

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * MainActivity
 * Jetpack Compose Material 3 control panel for Floating Buddy AI.
 * Handles overlay permissions, media projection consent, API key storage,
 * live companion stats inspection, and service lifecycle.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0F172A)
                ) {
                    FloatingBuddyApp()
                }
            }
        }
    }
}

@Composable
fun FloatingBuddyApp() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var apiKey by remember { mutableStateOf(OpenRouterClient.getApiKey(context)) }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var isTestingApi by remember { mutableStateOf(false) }

    var stats by remember { mutableStateOf(SlimeStats.load(context)) }

    // Periodically refresh stats
    LaunchedEffect(Unit) {
        while (true) {
            stats = SlimeStats.load(context)
            kotlinx.coroutines.delay(3000)
        }
    }

    // MediaProjection permission launcher
    val mediaProjectionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val serviceIntent = Intent(context, FloatingService::class.java).apply {
                putExtra(FloatingService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(FloatingService.EXTRA_RESULT_DATA, result.data)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Toast.makeText(context, "Slime companion summoned! Look for your floating buddy!", Toast.LENGTH_SHORT).show()
        } else {
            // Started without screen capture permission
            val serviceIntent = Intent(context, FloatingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Toast.makeText(context, "Slime started (Screen capture disabled)", Toast.LENGTH_SHORT).show()
        }
    }

    // Function to initiate start service flow
    val startServiceFlow = {
        // Step 1: Check Draw over other apps permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            Toast.makeText(context, "Please grant 'Display over other apps' permission", Toast.LENGTH_LONG).show()
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:\${context.packageName}")
            )
            context.startActivity(intent)
        } else {
            // Step 2: Request MediaProjection consent for vision features
            val mpManager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            mediaProjectionLauncher.launch(mpManager.createScreenCaptureIntent())
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top Title
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(top = 16.dp, bottom = 24.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF4ADE80), Color(0xFF16A34A))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "🟢", fontSize = 22.sp)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "Floating Buddy AI",
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Slime Companion & Screen Assistant",
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp
                )
            }
        }

        // Section 1: OpenRouter API Key
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text(
                    text = "1. OpenRouter AI Configuration",
                    color = Color(0xFF38BDF8),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Powered by OpenRouter with google/gemini-flash-1.5 for text and screen vision.",
                    color = Color(0xFFCBD5E1),
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = apiKey,
                    onValueChange = { apiKey = it },
                    label = { Text("OpenRouter API Key") },
                    singleLine = true,
                    visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    trailingIcon = {
                        IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = "Toggle key visibility",
                                tint = if (isPasswordVisible) Color(0xFF38BDF8) else Color(0xFF94A3B8)
                            )
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color(0xFFF1F5F9),
                        focusedBorderColor = Color(0xFF38BDF8),
                        unfocusedBorderColor = Color(0xFF475569),
                        focusedLabelColor = Color(0xFF38BDF8),
                        unfocusedLabelColor = Color(0xFF94A3B8)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = {
                            OpenRouterClient.saveApiKey(context, apiKey)
                            Toast.makeText(context, "API Key saved securely!", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Save Key", fontWeight = FontWeight.Medium)
                    }

                    OutlinedButton(
                        onClick = {
                            if (apiKey.isBlank()) {
                                Toast.makeText(context, "Please enter an API key first", Toast.LENGTH_SHORT).show()
                                return@OutlinedButton
                            }
                            isTestingApi = true
                            coroutineScope.launch {
                                OpenRouterClient.saveApiKey(context, apiKey)
                                val response = withContext(Dispatchers.IO) {
                                    OpenRouterClient.chat(context, "hi")
                                }
                                isTestingApi = false
                                Toast.makeText(context, "AI Reply: $response", Toast.LENGTH_LONG).show()
                            }
                        },
                        enabled = !isTestingApi,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(if (isTestingApi) "Pinging..." else "Test API (\\"hi\\")")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Section 2: Slime Stats
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "2. Slime Stats & Mood",
                        color = Color(0xFF4ADE80),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Mood: \${stats.getMood().name}",
                        color = when (stats.getMood()) {
                            SlimeStats.SlimeMood.HAPPY -> Color(0xFF4ADE80)
                            SlimeStats.SlimeMood.NEUTRAL -> Color(0xFFFBBF24)
                            SlimeStats.SlimeMood.SAD -> Color(0xFF818CF8)
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Hunger Bar
                StatBar(
                    label = "Hunger",
                    value = stats.hunger,
                    color = Color(0xFFEF4444),
                    subtext = "Drops 1 point every 5 minutes"
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Happiness Bar
                StatBar(
                    label = "Happiness",
                    value = stats.happiness,
                    color = Color(0xFFF59E0B),
                    subtext = "Affected when hunger drops below 30"
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Energy Bar
                StatBar(
                    label = "Energy",
                    value = stats.energy,
                    color = Color(0xFF38BDF8),
                    subtext = "Consumed when playing"
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Quick Care Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            stats.feed(20)
                            SlimeStats.save(context, stats)
                            Toast.makeText(context, "Fed slime (+20 hunger)", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🍎 Feed", fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = {
                            stats.play(15)
                            SlimeStats.save(context, stats)
                            Toast.makeText(context, "Played with slime (+15 happiness)", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🎾 Play", fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = {
                            stats.rest(20)
                            SlimeStats.save(context, stats)
                            Toast.makeText(context, "Slime rested (+20 energy)", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("💤 Rest", fontSize = 12.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Section 3 & 4: Service Controls & Instructions
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text(
                    text = "3. Overlay Controls",
                    color = Color(0xFFA855F7),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(10.dp))

                // Start Button
                Button(
                    onClick = { startServiceFlow() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Start Floating Buddy", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Stop Button
                Button(
                    onClick = {
                        val stopIntent = Intent(context, FloatingService::class.java)
                        context.stopService(stopIntent)
                        Toast.makeText(context, "Floating Buddy dismissed", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp)
                ) {
                    Text("Stop Floating Buddy", fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Gesture cheat sheet
                Text(
                    text = "Slime Overlay Gestures:",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(6.dp))
                GestureInfo(gesture = "👆 Single Tap", action = "AI cute chat with current stats")
                GestureInfo(gesture = "✌️ Double Tap", action = "Screen capture & AI vision analysis")
                GestureInfo(gesture = "⏱️ Long Press (500ms)", action = "Open Quick Feed Menu (+20)")
                GestureInfo(gesture = "🖐️ Drag", action = "Freely move slime anywhere on screen")
            }
        }

        Spacer(modifier = Modifier.height(30.dp))
    }
}

@Composable
fun StatBar(label: String, value: Int, color: Color, subtext: String) {
    val animatedProgress by animateFloatAsState(targetValue = value / 100f, label = "statAnim")
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = label, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Text(text = "$value%", color = color, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { animatedProgress },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = color,
            trackColor = Color(0xFF334155),
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = subtext, color = Color(0xFF64748B), fontSize = 10.5.sp)
    }
}

@Composable
fun GestureInfo(gesture: String, action: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = gesture, color = Color(0xFFCBD5E1), fontSize = 12.sp, fontWeight = FontWeight.Medium)
        Text(text = action, color = Color(0xFF94A3B8), fontSize = 11.5.sp)
    }
}`
  },
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    category: 'Manifest',
    description: 'System alert window, foreground service media projection, and internet permissions',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.floatingbuddy.ai">

    <!-- Permissions required for Floating Buddy AI -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.FloatingBuddyAI"
        tools:targetApi="34">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:theme="@style/Theme.FloatingBuddyAI">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Floating Slime Overlay Foreground Service -->
        <service
            android:name=".FloatingService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="mediaProjection" />

    </application>

</manifest>`
  },
  {
    name: 'app/build.gradle.kts',
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    category: 'Config',
    description: 'OkHttp3, Coroutines, DataStore Preferences, Gson, Compose Material 3 dependencies',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.floatingbuddy.ai"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.floatingbuddy.ai"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Project Requested Dependencies
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    implementation("com.google.code.gson:gson:2.10.1")

    // AndroidX & Jetpack Compose
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.02.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}`
  },
  {
    name: 'build.gradle.kts (Root)',
    path: 'build.gradle.kts',
    language: 'kotlin',
    category: 'Config',
    description: 'Root Gradle configuration applying Android application and Kotlin plugins',
    content: `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}`
  },
  {
    name: 'settings.gradle.kts',
    path: 'settings.gradle.kts',
    language: 'kotlin',
    category: 'Config',
    description: 'Project settings and repository declarations (Google Maven, Maven Central, Gradle Plugin Portal)',
    content: `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "FloatingBuddyAI"
include(":app")`
  },
  {
    name: 'libs.versions.toml',
    path: 'gradle/libs.versions.toml',
    language: 'toml',
    category: 'Config',
    description: 'Gradle Version Catalog for modern dependency versions',
    content: `[versions]
agp = "8.2.2"
kotlin = "1.9.22"
coreKtx = "1.12.0"
junit = "4.13.2"
junitVersion = "1.1.5"
espressoCore = "3.5.1"
lifecycleRuntimeKtx = "2.7.0"
activityCompose = "1.8.2"
composeBom = "2024.02.00"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }
androidx-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }`
  },
  {
    name: 'build-apk.yml',
    path: '.github/workflows/build-apk.yml',
    language: 'yaml',
    category: 'Config',
    description: 'GitHub Actions CI workflow that compiles and exports the debug APK to download in artifacts',
    content: `name: Build Android Debug APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    name: Build & Export Debug APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3

      - name: Grant Execute Permissions to Gradle
        run: |
          if [ -f "./gradlew" ]; then
            chmod +x ./gradlew
          elif [ -f "./android/gradlew" ]; then
            chmod +x ./android/gradlew
          fi

      - name: Build Debug APK with Gradle
        run: |
          if [ -d "./android" ]; then
            cd android
            ./gradlew assembleDebug --stacktrace
          else
            ./gradlew assembleDebug --stacktrace
          fi

      - name: Verify Generated APK
        run: |
          echo "Locating built APK files..."
          find . -name "*.apk" -type f

      - name: Upload Debug APK to Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: floating-buddy-ai-debug-apk
          path: '**/app/build/outputs/apk/debug/*.apk'
          retention-days: 30
          if-no-files-found: error`
  },
  {
    name: 'gradle-wrapper.properties',
    path: 'gradle/wrapper/gradle-wrapper.properties',
    language: 'properties',
    category: 'Config',
    description: 'Gradle wrapper configuration specifying Gradle 8.2 distribution',
    content: `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`
  }
];
