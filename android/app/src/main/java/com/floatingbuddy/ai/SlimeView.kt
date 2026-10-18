package com.floatingbuddy.ai

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.view.View
import kotlin.math.sin

/**
 * SlimeView
 * Custom native Android View that draws the animated floating slime companion:
 * - Dynamic squish, idle breathing oscillation, and bounce physics
 * - Floor shadow oval with depth
 * - 6 distinct mood expressions:
 *     0: Happy (sparkling eyes, smiling curve, blush cheeks)
 *     1: Sleepy (closed eye lines, floating Z z)
 *     2: Angry / Dizzy (furrowed eyebrows, stern mouth, spinning dizzy pupils)
 *     3: In Love / Excited (crimson eyes, blushing cheeks, warm smile)
 *     4: Yummy / Nom Nom (munching open mouth with pink tongue)
 *     5: Confused (Asymmetric raised/lowered eyebrows, wavy puzzled mouth, floating '?')
 * - Dance mode: Rhythmic sway rotation, vertical hop bounce, squish, and floating musical notes (♪, ♫)
 * - Custom speech bubble with directional tail
 */
class SlimeView(context: Context) : View(context) {
    var squish = 0f
    var bounce = 0f
    var mood = 0
        set(v) {
            field = v % 6
            invalidate()
        }
    var message: String? = null
    var scale = 1f

    // Dance state
    var isDancing = false
        private set
    var danceRotation = 0f
    var danceNotePhase = 0f

    // Confused wobble state
    var confusedTilt = 0f

    private val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#5DADE2") }
    private val bodyDarkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#2E86C1") }
    private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; alpha = 150 }
    private val eyePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK }
    private val eyeWhitePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    private val blushPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F1948A"); alpha = 120 }
    private val musicNotePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#8B5CF6")
        textSize = 36f
        typeface = Typeface.DEFAULT_BOLD
    }
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

    /**
     * Organic bounce animation when tapped or landing
     */
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

    /**
     * Rhythmic dance animation with musical notes and rotation sway
     */
    fun danceAnim(durationMs: Long = 4200) {
        if (isDancing) return
        isDancing = true
        say(listOf("Dancing time! 💃🎶", "Cha cha bloop! 🎵", "Feel the beat! 🕺✨").random(), durationMs)

        val animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = durationMs
            addUpdateListener {
                val frac = it.animatedFraction
                // Sway back and forth 6 times during dance
                val cycles = frac * Math.PI * 12
                danceRotation = sin(cycles).toFloat() * 16f
                bounce = kotlin.math.abs(sin(cycles)).toFloat() * 22f
                squish = sin(cycles).toFloat() * 0.22f
                danceNotePhase = frac * 360f
                invalidate()
            }
        }
        animator.start()

        postDelayed({
            isDancing = false
            danceRotation = 0f
            bounce = 0f
            squish = 0f
            invalidate()
        }, durationMs)
    }

    /**
     * Confused animation with tilted head and eyebrow reaction
     */
    fun confusedAnim() {
        mood = 5
        say(listOf("Huh? 🤔", "Wait, what?", "Does not compute! 🧩", "Bloop?").random(), 3500)

        ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1200
            addUpdateListener {
                val frac = it.animatedFraction
                confusedTilt = sin(frac * Math.PI * 2).toFloat() * 10f
                invalidate()
            }
            start()
        }
    }

    /**
     * Shows a speech bubble with auto-dismiss
     */
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

    /**
     * Continuous gentle idle breathing squish cycle
     */
    fun startIdle() {
        ValueAnimator.ofFloat(0f, 360f).apply {
            duration = 2000
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener {
                if (!isDancing) {
                    val deg = it.animatedValue as Float
                    squish = sin(Math.toRadians(deg.toDouble())).toFloat() * 0.05f
                    invalidate()
                }
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

        // Rotate for dance or confused head tilt
        if (isDancing) {
            canvas.rotate(danceRotation, cx, cy)
        } else if (confusedTilt != 0f) {
            canvas.rotate(confusedTilt, cx, cy)
        }

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

        // 4. Mood expressions (0: Happy, 1: Sleepy, 2: Angry, 3: In Love, 4: Yummy, 5: Confused)
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
            5 -> {
                // Confused / Curious mood: Asymmetrical eyebrows and question mark
                // Left eye: Big wide inquisitive eye
                canvas.drawCircle(leftEyeX, eyeY, w * 0.08f, eyeWhitePaint)
                canvas.drawCircle(leftEyeX + w * 0.015f, eyeY - h * 0.01f, w * 0.04f, eyePaint)

                // Right eye: Slightly narrowed skeptical eye
                canvas.drawCircle(rightEyeX, eyeY, w * 0.06f, eyeWhitePaint)
                canvas.drawCircle(rightEyeX, eyeY, w * 0.03f, eyePaint)

                // Eyebrow Paint
                val bp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.BLACK
                    style = Paint.Style.STROKE
                    strokeWidth = w * 0.024f
                    strokeCap = Paint.Cap.ROUND
                }

                // Left Eyebrow: Inquisitively arched high
                val leftBrow = Path().apply {
                    moveTo(leftEyeX - w * 0.08f, eyeY - h * 0.13f)
                    quadTo(leftEyeX, eyeY - h * 0.19f, leftEyeX + w * 0.08f, eyeY - h * 0.13f)
                }
                canvas.drawPath(leftBrow, bp)

                // Right Eyebrow: Furrowed down toward center
                canvas.drawLine(rightEyeX - w * 0.07f, eyeY - h * 0.07f, rightEyeX + w * 0.07f, eyeY - h * 0.11f, bp)

                // Wavy puzzled mouth: ~
                val mouthPath = Path().apply {
                    moveTo(cx - w * 0.09f, eyeY + h * 0.14f)
                    quadTo(cx - w * 0.03f, eyeY + h * 0.11f, cx, eyeY + h * 0.14f)
                    quadTo(cx + w * 0.04f, eyeY + h * 0.17f, cx + w * 0.09f, eyeY + h * 0.14f)
                }
                canvas.drawPath(mouthPath, bp)

                // Floating question mark above right side
                val qp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#38BDF8")
                    textSize = w * 0.15f
                    typeface = Typeface.DEFAULT_BOLD
                }
                canvas.drawText("?", cx + w * 0.28f, eyeY - h * 0.16f, qp)
            }
        }

        // Cheeks (for moods except sleepy and confused)
        if (mood != 1 && mood != 5) {
            canvas.drawCircle(cx - w * 0.22f, eyeY + h * 0.12f, w * 0.05f, blushPaint)
            canvas.drawCircle(cx + w * 0.22f, eyeY + h * 0.12f, w * 0.05f, blushPaint)
        }

        // 5. Dance Floating Musical Notes (♪, ♫)
        if (isDancing) {
            val note1Y = (eyeY - h * 0.22f) + sin(Math.toRadians(danceNotePhase.toDouble())).toFloat() * 10f
            val note2Y = (eyeY - h * 0.28f) + sin(Math.toRadians((danceNotePhase + 180).toDouble())).toFloat() * 10f
            canvas.drawText("♪", cx - w * 0.32f, note1Y, musicNotePaint)
            canvas.drawText("♫", cx + w * 0.28f, note2Y, musicNotePaint)
        }

        // 6. Speech Bubble with Tail
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
