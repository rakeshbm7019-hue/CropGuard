import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
  AdMobBannerSize,
  RewardAdOptions,
  RewardAdPluginEvents,
  AdOptions,
} from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const ADMOB_APP_ID = 'ca-app-pub-6652067022010690~4420290370';
const BANNER_ID = 'ca-app-pub-6652067022010690/7039101892';
const INTERSTITIAL_ID = 'ca-app-pub-6652067022010690/3622601065';
const REWARDED_ID = 'ca-app-pub-6652067022010690/1690185253';
const NATIVE_ID = 'ca-app-pub-6652067022010690/2261030890';
const APP_OPEN_ID = 'ca-app-pub-6652067022010690/8170641152';

export async function initializeAdMob() {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: false,
    });
    console.log('AdMob Initialized');
  } catch (error) {
    console.error('Error initializing AdMob:', error);
  }
}

export async function showBanner() {
  if (Capacitor.getPlatform() === 'web') return;
  const options: BannerAdOptions = {
    adId: BANNER_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: false,
  };
  try {
    await AdMob.showBanner(options);
  } catch (error) {
    console.error('Error showing banner:', error);
  }
}

export async function hideBanner() {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.error('Error hiding banner:', error);
  }
}

export async function showInterstitial() {
  if (Capacitor.getPlatform() === 'web') return;
  const options: AdOptions = {
    adId: INTERSTITIAL_ID,
    isTesting: false,
  };
  try {
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
  } catch (error) {
    console.error('Error showing interstitial:', error);
  }
}

export async function showRewardedAd(onReward: () => void) {
  if (Capacitor.getPlatform() === 'web') {
    // Simulate reward on web for development
    onReward();
    return;
  }
  const options: RewardAdOptions = {
    adId: REWARDED_ID,
    isTesting: false,
  };
  try {
    await AdMob.prepareRewardVideoAd(options);
    
    const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
      console.log('User rewarded:', reward);
      onReward();
      rewardListener.remove();
    });

    await AdMob.showRewardVideoAd();
  } catch (error) {
    console.error('Error showing rewarded ad:', error);
  }
}

export async function showAppOpenAd() {
  if (Capacitor.getPlatform() === 'web') return;
  const options: AdOptions = {
    adId: APP_OPEN_ID,
    isTesting: false,
  };
  try {
    // @ts-ignore - AppOpen might not be explicitly in all versions of the types
    if (AdMob.showAppOpenAd) {
      // @ts-ignore
      await AdMob.showAppOpenAd(options);
    }
  } catch (error) {
    console.error('Error showing app open ad:', error);
  }
}

