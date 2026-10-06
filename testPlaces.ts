export async function searchShopsViaGooglePlaces(lat: number, lng: number, language: string, apiKey: string) {
  const radius = 25000;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=store&keyword=fertilizer|pesticide|seed|agricultural&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}
