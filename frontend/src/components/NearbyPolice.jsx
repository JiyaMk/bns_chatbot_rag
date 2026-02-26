import { useEffect, useState } from "react";
import "./NearbyPolice.css";

const NearbyPolice = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            "http://127.0.0.1:8000/api/nearby-police",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              }),
            }
          );

          const data = await response.json();

          if (data.error) {
            setError(data.error);
          } else {
            setStations(data.stations);
          }

        } catch (err) {
          setError("Unable to fetch police stations.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location permission denied.");
        setLoading(false);
      }
    );
  }, []);

  if (loading) return <p>Detecting nearby assistance...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="police-panel">
      <h3>Nearby Law Enforcement Assistance</h3>

      {stations.length === 0 && (
        <p>No police stations found within selected radius.</p>
      )}

      {stations.map((station) => (
        <div key={station.id} className="station-item">
          <strong>{station.name}</strong>
          <p>{station.distance_km} km away</p>
          <a
            href={station.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Directions
          </a>
        </div>
      ))}
    </div>
  );
};

export default NearbyPolice;