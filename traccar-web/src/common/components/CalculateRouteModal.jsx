import React, { useState, useContext } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useTranslation } from './LocalizationProvider';
import MapContext from '../../map/MapContext';
import debounce from 'lodash/debounce';
import maplibregl from 'maplibre-gl';

const CalculateRouteModal = ({ open, onClose, devicePosition, map }) => {
  const t = useTranslation(); // Adjust according to your implementation
  const [options, setOptions] = useState([]);


  if (!map) {
    console.error('El mapa no está disponible en CalculateRouteModal.');
    return null;
  }


  // Debounced function to fetch suggestions
  const fetchSuggestions = debounce((input) => {
    if (input.trim() !== '') {
      fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          input
        )}&limit=5&bbox=-72.0,17.4,-68.0,20.1`
      )
        .then((response) => response.json())
        .then((data) => {
          setOptions(data.features);
        })
        .catch((error) => {
          console.error('Error fetching suggestions:', error);
        });
    } else {
      setOptions([]);
    }
  }, 300);

  const handleInputChange = (event, value) => {
    fetchSuggestions(value);
  };

  function getRoute(origin, destination) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
    return fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data && data.routes && data.routes.length > 0) {
          return data.routes[0].geometry;
        } else {
          throw new Error('Unable to calculate the route.');
        }
      });
  }

  function displayRouteOnMap(map, geometry) {
    // Remove existing route layer if it exists
    if (map.getSource('route')) {
      if (map.getLayer('route')) {
        map.removeLayer('route');
      }
      map.removeSource('route');
    }
  
    // Add the new route as a GeoJSON source
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: geometry,
      },
    });
  
    // Add a layer to display the route
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b9ddd',
        'line-width': 5,
      },
    });
  
    // Fit the map to the bounds of the route
    const coordinates = geometry.coordinates;
    const bounds = coordinates.reduce(
      (bounds, coord) => bounds.extend(coord),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
    );
  
    map.fitBounds(bounds, {
      padding: 50,
    });
  
    const endCoordinates = geometry.coordinates[geometry.coordinates.length - 1];
  
    // Remove existing end marker if it exists
    if (map.getSource('route-end')) {
      if (map.getLayer('route-end')) {
        map.removeLayer('route-end');
      }
      map.removeSource('route-end');
    }
  
    // Add a new source for the end marker
    map.addSource('route-end', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: endCoordinates,
        },
      },
    });
  
    // Add a layer to display the end marker
    map.addLayer({
      id: 'route-end',
      type: 'circle',
      source: 'route-end',
      paint: {
        'circle-radius': 6,
        'circle-color': '#ff0000',
      },
    });
  }
  

  const handleSelect = (event, value) => {
    if (value) {
      const destCoords = {
        latitude: value.geometry.coordinates[1],
        longitude: value.geometry.coordinates[0],
      };
      getRoute(devicePosition, destCoords)
        .then((routeGeometry) => {
          displayRouteOnMap(map, routeGeometry);
        })
        .catch((error) => {
          console.error(error);
          alert('Error calculating the route: ' + error.message);
        });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('deviceCalculateRoute')}</DialogTitle>
      <DialogContent>
        <Autocomplete
          freeSolo
          options={options}
          getOptionLabel={(option) => option.properties.name || ''}
          onInputChange={handleInputChange}
          onChange={handleSelect}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('deviceDestination')}
              margin="dense"
              fullWidth
              autoFocus
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CalculateRouteModal;
