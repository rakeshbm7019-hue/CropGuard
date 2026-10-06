package com.cropguard.ai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Science
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cropguard.ai.ui.components.AdMobBanner

@Composable
fun SoilAdvisorScreen() {
    val scrollState = rememberScrollState()

    var selectedSoilType by remember { mutableStateOf("Red Sandy Loam (Alur / Malnad)") }

    val soilTypes = listOf(
        "Red Sandy Loam (Alur / Malnad)",
        "Laterite Soil (Sakleshpur / High Hills)",
        "Deep Black Cotton Soil (Maidan)",
        "Alluvial River Basin Soil"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Science,
                    contentDescription = "Soil",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(36.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "Precision Soil & Crop Advisory",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "ICAR fertilizer dosage and optimal crop matching",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Soil Selection Chips
        Text(
            text = "Select Field Soil Type:",
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.labelLarge
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            soilTypes.forEach { type ->
                FilterChip(
                    selected = selectedSoilType == type,
                    onClick = { selectedSoilType = type },
                    label = { Text(type, fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.primary
                    )
                )
            }
        }

        // Soil Health Parameters Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Estimated Soil Profile ($selectedSoilType)",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    SoilMetricItem(label = "Soil pH", value = "6.2 (Slightly Acidic)", color = Color(0xFF16A34A))
                    SoilMetricItem(label = "Organic Carbon", value = "0.75% (Medium-High)", color = Color(0xFF2563EB))
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    SoilMetricItem(label = "Nitrogen (N)", value = "280 kg/ha", color = Color(0xFFD97706))
                    SoilMetricItem(label = "Phosphorus (P)", value = "18 kg/ha", color = Color(0xFF9333EA))
                    SoilMetricItem(label = "Potassium (K)", value = "310 kg/ha", color = Color(0xFF059669))
                }
            }
        }

        // Best Matching Crops Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Eco, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Top Recommended Crops for this Soil",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium
                    )
                }

                RecommendedCropItem(
                    name = "Coffee (Arabica / Robusta)",
                    reason = "Ideal pH 6.0-6.5 and rich organic content in Alur-Sakleshpur slopes.",
                    expectedYield = "800 - 1,200 kg clean coffee / acre"
                )
                RecommendedCropItem(
                    name = "Black Pepper (Panniyur-1)",
                    reason = "High drainage requirement matching red loam; excellent intercrop on silver oak.",
                    expectedYield = "400 - 650 kg dry pepper / acre"
                )
                RecommendedCropItem(
                    name = "Hybrid Maize & Ragi",
                    reason = "Responsive to moderate nitrogen; excellent drought tolerance in lower plains.",
                    expectedYield = "25 - 32 quintals / acre"
                )
                RecommendedCropItem(
                    name = "Ginger (Maran / Rio-de-Janeiro)",
                    reason = "Requires loose, well-aerated red soil without waterlogging.",
                    expectedYield = "8 - 12 tonnes fresh rhizomes / acre"
                )
            }
        }

        AdMobBanner()
    }
}

@Composable
fun SoilMetricItem(label: String, value: String, color: Color) {
    Column {
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
        Text(text = value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
fun RecommendedCropItem(name: String, reason: String, expectedYield: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(text = name, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Text(text = reason, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
            Text(text = "Expected Yield: $expectedYield", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
        }
    }
}
