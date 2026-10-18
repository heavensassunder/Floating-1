package com.floatingbuddy.ai

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
}
