package com.cropguard.ai.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Scanner : Screen("scanner", "Scan Crop", Icons.Default.CameraAlt)
    object SoilAdvisor : Screen("soil", "Soil & Crops", Icons.Default.Eco)
    object FertilizerStores : Screen("stores", "Agri Stores", Icons.Default.Store)
    object MandiWeather : Screen("weather", "Weather & Mandi", Icons.Default.WbSunny)
}
