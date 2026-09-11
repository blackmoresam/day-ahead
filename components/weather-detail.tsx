type Hourly = {
  time: string[];
  temperature_2m: (number | null)[];
  apparent_temperature: (number | null)[];
  precipitation_probability: (number | null)[];
  wind_speed_10m: (number | null)[];
  weather_code: (number | null)[];
};
const value = (n: number | null | undefined, unit: string) => typeof n === 'number' && Number.isFinite(n) ? `${Math.round(n)}${unit}` : 'Unavailable';
function condition(code: number | null | undefined) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code != null && code >= 51 && code <= 57) return 'Drizzle';
  if (code != null && code >= 61 && code <= 67) return 'Rain';
  if (code != null && code >= 71 && code <= 77) return 'Snow';
  if (code != null && code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code != null && code >= 95) return 'Thunderstorms';
  return 'Conditions unavailable';
}
function numbers(values: (number | null)[], indices: number[]) {
  return indices.map(i => values?.[i]).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
}
export default function WeatherDetail({ hourly, dateLabel }: { hourly?: Hourly; dateLabel: string }) {
  if (!hourly?.time?.length) return <p>Hourly forecast unavailable. Refresh to try again.</p>;
  const periods = [{label:'AM', hours:'06:00–12:00',from:6,to:12},{label:'PM',hours:'12:00–18:00',from:12,to:18},{label:'Evening',hours:'18:00–24:00',from:18,to:24}];
  return <><p className="forecast-date">{dateLabel} · UK local time</p><div className="weather-periods">{periods.map(period => {
    const indices = hourly.time.map((t,i) => ({hour:Number(t.slice(11,13)),i})).filter(x=>x.hour>=period.from && x.hour<period.to).map(x=>x.i);
    const temps=numbers(hourly.temperature_2m,indices), rain=numbers(hourly.precipitation_probability,indices), wind=numbers(hourly.wind_speed_10m,indices);
    return <div className="weather-period" key={period.label}><div className="period-label"><strong>{period.label}</strong><span>{period.hours}</span></div><div className="period-temperature">{temps.length?`${Math.round(Math.min(...temps))}–${Math.round(Math.max(...temps))}°C`:'Unavailable'}</div><div className="period-metrics"><span>Rain {rain.length?value(Math.max(...rain),'%'):'unavailable'} max</span><span>Wind {wind.length?value(Math.max(...wind),' mph'):'unavailable'} max</span></div></div>;
  })}</div><details className="hourly-details"><summary>See hour by hour</summary><p>Rain is the chance for each hour. Wind is forecast speed, not gusts.</p><div className="hourly-scroll" tabIndex={0} role="region" aria-label="Hourly weather table"><table><thead><tr><th scope="col">Time</th><th scope="col">Weather</th><th scope="col">Temp</th><th scope="col">Feels</th><th scope="col">Rain</th><th scope="col">Wind</th></tr></thead><tbody>{hourly.time.map((t,i)=><tr key={t}><th scope="row">{t.slice(11,16)}</th><td>{condition(hourly.weather_code?.[i])}</td><td>{value(hourly.temperature_2m?.[i],'°C')}</td><td>{value(hourly.apparent_temperature?.[i],'°C')}</td><td>{value(hourly.precipitation_probability?.[i],'%')}</td><td>{value(hourly.wind_speed_10m?.[i],' mph')}</td></tr>)}</tbody></table></div></details></>;
}
