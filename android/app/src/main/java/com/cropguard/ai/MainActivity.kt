package com.cropguard.ai

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cropguard.ai.ui.navigation.Screen
import com.cropguard.ai.ui.screens.FertilizerStoresScreen
import com.cropguard.ai.ui.screens.MandiWeatherScreen
import com.cropguard.ai.ui.screens.ScannerScreen
import com.cropguard.ai.ui.screens.SoilAdvisorScreen
import com.cropguard.ai.ui.theme.CropGuardTheme
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

// Native AdMob Ad Unit IDs
const val ADMOB_INTERSTITIAL_ID = "ca-app-pub-6652067022010690/3622601065"
const val ADMOB_REWARDED_ID = "ca-app-pub-6652067022010690/1690185253"

class MainActivity : ComponentActivity() {

    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Google Mobile Ads SDK for Native Android
        MobileAds.initialize(this) { status ->
            Log.d("CropGuardAI", "Mobile Ads Initialized: $status")
            loadInterstitialAd()
            loadRewardedAd()
        }

        // Initialize Firebase Cloud Messaging Notification Channels & Token
        com.cropguard.ai.services.CropGuardMessagingService.createNotificationChannels(this)
        com.cropguard.ai.services.FcmManager.fetchAndRegisterToken(this)

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
            }
        }

        setContent {
            CropGuardTheme {
                CropGuardNativeApp(
                    onShowInterstitial = { showInterstitial() },
                    onShowRewarded = { onSuccess -> showRewarded(onSuccess) }
                )
            }
        }
    }

    private fun loadInterstitialAd() {
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(
            this,
            ADMOB_INTERSTITIAL_ID,
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                }
                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialAd = null
                }
            }
        )
    }

    private fun showInterstitial() {
        interstitialAd?.show(this)
        loadInterstitialAd() // Pre-load next
    }

    private fun loadRewardedAd() {
        val adRequest = AdRequest.Builder().build()
        RewardedAd.load(
            this,
            ADMOB_REWARDED_ID,
            adRequest,
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewardedAd = ad
                }
                override fun onAdFailedToLoad(error: LoadAdError) {
                    rewardedAd = null
                }
            }
        )
    }

    private fun showRewarded(onRewardGranted: () -> Unit) {
        val ad = rewardedAd
        if (ad != null) {
            ad.show(this) { _ ->
                onRewardGranted()
            }
            loadRewardedAd() // Pre-load next
        } else {
            // If ad is loading or offline, grant directly so user experience isn't blocked
            onRewardGranted()
            loadRewardedAd()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CropGuardNativeApp(
    onShowInterstitial: () -> Unit,
    onShowRewarded: (onSuccess: () -> Unit) -> Unit
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Scanner.route

    val navigationItems = listOf(
        Screen.Scanner,
        Screen.SoilAdvisor,
        Screen.FertilizerStores,
        Screen.MandiWeather
    )

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "CropGuard",
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {}) {
                        Icon(
                            Icons.Default.Eco,
                            contentDescription = "Logo",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                navigationItems.forEach { screen ->
                    NavigationBarItem(
                        selected = currentRoute == screen.route,
                        onClick = {
                            if (currentRoute != screen.route) {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.startDestinationId) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                                // Occasionally show interstitial on tab switch
                                if (screen == Screen.FertilizerStores || screen == Screen.MandiWeather) {
                                    onShowInterstitial()
                                }
                            }
                        },
                        icon = { Icon(screen.icon, contentDescription = screen.title) },
                        label = { Text(screen.title, fontWeight = FontWeight.SemiBold) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Scanner.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Scanner.route) {
                ScannerScreen(onTriggerRewardedAd = onShowRewarded)
            }
            composable(Screen.SoilAdvisor.route) {
                SoilAdvisorScreen()
            }
            composable(Screen.FertilizerStores.route) {
                FertilizerStoresScreen()
            }
            composable(Screen.MandiWeather.route) {
                MandiWeatherScreen()
            }
        }
    }
}
