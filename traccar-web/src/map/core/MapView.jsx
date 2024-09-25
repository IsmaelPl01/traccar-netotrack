// eslint-disable-next-line import/no-unresolved
import mapboxglRtlTextUrl from '@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import React, {
  useRef, useLayoutEffect, useEffect, useState,
} from 'react';
import MapContext from '../MapContext'; // Importa el contexto del mapa
import { SwitcherControl } from '../switcher/switcher';
import { useAttributePreference, usePreference } from '../../common/util/preferences';
import usePersistedState, { savePersistedState } from '../../common/util/usePersistedState';
import { mapImages } from './preloadImages';
import useMapStyles from './useMapStyles';


export let map = null; // Cambiamos 'const' a 'let' para poder asignarlo después

// Inicialización global del contenedor del mapa
const element = document.createElement('div');
element.style.width = '100%';
element.style.height = '100%';
element.style.boxSizing = 'initial';

maplibregl.setRTLTextPlugin(mapboxglRtlTextUrl); // Configuración para texto RTL (derecha a izquierda)

export const mapReadyPromise = new Promise((resolve) => {
  // Inicializamos el mapa
  map = new maplibregl.Map({
    container: element,
    attributionControl: false,
    // ... otras configuraciones ...
  });

    // Esperamos a que el mapa se cargue
    map.on('load', () => {
      resolve(map); // Resolvemos la promesa con el objeto 'map'
    });
  });

let ready = false;
const readyListeners = new Set();

const addReadyListener = (listener) => {
  readyListeners.add(listener);
  listener(ready);
};

const removeReadyListener = (listener) => {
  readyListeners.delete(listener);
};

const updateReadyValue = (value) => {
  ready = value;
  readyListeners.forEach((listener) => listener(value));
};

const initMap = async () => {
  if (ready) return;
  if (!map.hasImage('background')) {
    Object.entries(mapImages).forEach(([key, value]) => {
      map.addImage(key, value, {
        pixelRatio: window.devicePixelRatio,
      });
    });
  }
  updateReadyValue(true);
};

// Añade controles de navegación al mapa
map.addControl(new maplibregl.NavigationControl());

const switcher = new SwitcherControl(
  () => updateReadyValue(false),
  (styleId) => savePersistedState('selectedMapStyle', styleId),
  () => {
    map.once('styledata', () => {
      const waiting = () => {
        if (!map.loaded()) {
          setTimeout(waiting, 33);
        } else {
          initMap();
        }
      };
      waiting();
    });
  },
);

// Añade el control Switcher al mapa
map.addControl(switcher);

const MapView = ({ children }) => {
  const containerEl = useRef(null);
  const [mapReady, setMapReady] = useState(false); // Estado para saber si el mapa está listo

  // Preferencias y estilos para el mapa
  const mapStyles = useMapStyles();
  const activeMapStyles = useAttributePreference('activeMapStyles', 'locationIqStreets,osm,carto');
  const [defaultMapStyle] = usePersistedState('selectedMapStyle', usePreference('map', 'locationIqStreets'));
  const mapboxAccessToken = useAttributePreference('mapboxAccessToken');
  const maxZoom = useAttributePreference('web.maxZoom');

  // Ajusta el zoom máximo del mapa según la preferencia
  useEffect(() => {
    if (maxZoom) {
      map.setMaxZoom(maxZoom);
    }
  }, [maxZoom]);

  // Configura el token de Mapbox si es necesario
  useEffect(() => {
    maplibregl.accessToken = mapboxAccessToken;
  }, [mapboxAccessToken]);

  // Actualiza los estilos del mapa
  useEffect(() => {
    const filteredStyles = mapStyles.filter((s) => s.available && activeMapStyles.includes(s.id));
    const styles = filteredStyles.length ? filteredStyles : mapStyles.filter((s) => s.id === 'osm');
    switcher.updateStyles(styles, defaultMapStyle);
  }, [mapStyles, defaultMapStyle]);

  // Maneja los eventos para saber si el mapa está listo
  useEffect(() => {
    const listener = (ready) => setMapReady(ready);
    addReadyListener(listener);
    return () => {
      removeReadyListener(listener);
    };
  }, []);

  // Inserta el mapa en el contenedor cuando el componente se monta
  useLayoutEffect(() => {
    const currentEl = containerEl.current;
    currentEl.appendChild(element); // Añade el contenedor del mapa
    map.resize(); // Asegura que el mapa se ajuste al contenedor
    return () => {
      currentEl.removeChild(element); // Limpia cuando el componente se desmonta
    };
  }, [containerEl]);

  return (
    <MapContext.Provider value={map}>
      <div style={{ width: '100%', height: '100%' }} ref={containerEl}>
        {mapReady && children} {/* Solo renderiza los children cuando el mapa esté listo */}
      </div>
    </MapContext.Provider>
  );
};

export default MapView;
