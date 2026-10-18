package com.floatingbuddy.ai

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
                    "Bloop error (${response.code}): $msg"
                } catch (e: Exception) {
                    "Bloop error: HTTP ${response.code} ${response.message}"
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
            return@withContext "Slime hiccup: ${e.localizedMessage ?: "Connection error"}"
        }
    }
}
