package com.cropguard.ai.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// CropGuard AI Signature Agricultural Palette
val PrimaryGreen = Color(0xFF15803D)        // Emerald 700
val PrimaryContainer = Color(0xFFDCFCE7)    // Emerald 100
val OnPrimary = Color.White
val SecondaryAmber = Color(0xFFD97706)      // Amber 600
val SurfaceLight = Color(0xFFFBFBFA)        // Warm field off-white
val BackgroundLight = Color(0xFFF4F4F0)
val TextDark = Color(0xFF1C1917)            // Stone 900
val CardBorderLight = Color(0xFFE7E5E4)

val DarkPrimaryGreen = Color(0xFF4ADE80)    // Emerald 400
val DarkBackground = Color(0xFF121212)
val DarkSurface = Color(0xFF1E1E1E)
val DarkText = Color(0xFFF5F5F4)

private val LightColorScheme = lightColorScheme(
    primary = PrimaryGreen,
    onPrimary = OnPrimary,
    primaryContainer = PrimaryContainer,
    secondary = SecondaryAmber,
    background = BackgroundLight,
    surface = SurfaceLight,
    onBackground = TextDark,
    onSurface = TextDark
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimaryGreen,
    onPrimary = Color.Black,
    primaryContainer = Color(0xFF064E3B),
    secondary = Color(0xFFFBBF24),
    background = DarkBackground,
    surface = DarkSurface,
    onBackground = DarkText,
    onSurface = DarkText
)

@Composable
fun CropGuardTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
