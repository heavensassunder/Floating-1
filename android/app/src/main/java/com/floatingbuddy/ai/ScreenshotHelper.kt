package com.floatingbuddy.ai

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
}
