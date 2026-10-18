package com.floatingbuddy.ai

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
}
