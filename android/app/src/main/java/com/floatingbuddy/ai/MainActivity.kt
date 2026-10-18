package com.floatingbuddy.ai

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
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
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
                Uri.parse("package:${context.packageName}")
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
                        Text(if (isTestingApi) "Pinging..." else "Test API (\"hi\")")
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
                        text = "Mood: ${stats.getMood().name}",
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

                Spacer(modifier = Modifier.height(14.dp))

                // Animation Quick Test Triggers
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            val danceIntent = Intent(context, FloatingService::class.java).apply {
                                action = FloatingService.ACTION_TRIGGER_DANCE
                            }
                            context.startService(danceIntent)
                            Toast.makeText(context, "Dancing mode triggered! 💃🎶", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("💃 Dance Mode", fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = {
                            val confusedIntent = Intent(context, FloatingService::class.java).apply {
                                action = FloatingService.ACTION_TRIGGER_CONFUSED
                            }
                            context.startService(confusedIntent)
                            Toast.makeText(context, "Confused state triggered! 🤔", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🤔 Confused Mood", fontSize = 12.sp)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Gesture cheat sheet
                Text(
                    text = "Slime Overlay Gestures & Animations:",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(6.dp))
                GestureInfo(gesture = "👆 Single Tap", action = "AI cute chat & cycles 6 mood expressions")
                GestureInfo(gesture = "✌️ Double Tap", action = "Confused reaction + AI screen vision analysis")
                GestureInfo(gesture = "⏱️ Long Press (500ms)", action = "Nom Nom feeding animation (+20)")
                GestureInfo(gesture = "📳 Shake Device", action = "Alternates between dizzy (😠) and confused (🤔)")
                GestureInfo(gesture = "💃 Dance Mode", action = "Spontaneously bursts into dance every 45-75s!")
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
}
