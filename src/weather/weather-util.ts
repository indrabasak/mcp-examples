export class WeatherUtil {
  public static NWS_API_BASE: string = 'https://api.weather.gov';
  public static USER_AGENT = 'weather-app/1.0';

  public static async request<T>(url: string): Promise<T | null> {
    const headers = {
      'User-Agent': WeatherUtil.USER_AGENT,
      Accept: 'application/geo+json'
    };

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      console.error('Error making NWS request:', error);
      return null;
    }
  }
}
