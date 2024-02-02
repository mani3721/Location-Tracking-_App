import { useEffect, useState } from "react";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useMutation } from "@tanstack/react-query";
import { Platform } from "react-native";
import useAgentApi from "@/service/AgentApi";
import { useAppSelector } from "@/redux/hook";
import { Routes } from "./Routes";
import { store } from "@/redux/store";
import { API_URL } from "@/utils/service";
import axios from "axios";

export const LOCATION_TRACKING = "background-location-task";

export function ExpoLocationContainer({ children }) {
  const [locationStarted, setLocationStarted] = useState(false);
  const [forgroundLocationStarted, setForgroundLocationStarted] = useState(false);
  const { saveAgentLocation } = useAgentApi();
  const { token } = useAppSelector((state) => state.login);

  const mutation = useMutation({
    mutationFn: saveAgentLocation,
    onSuccess(data, variables, context) {
      console.log("Successfully Added Location to user!");
    },
  });

  const requestLocationPermission = async () => {
    let { status: locationForgroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (locationForgroundStatus === "granted") {
      if (Platform.OS !== "ios") {
        let { status: locationBackgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (locationBackgroundStatus === "granted") {
          return startLocationTracking();
        }
      }
      return startForgroundLocationTracking();
    } else {
      console.log("Permission to access location was denied");
      return;
    }
  };

  const startLocationTracking = async () => {
    await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 1000 * 60 * 5,
      distanceInterval: 0,
      // foregroundService: {
      //   notificationTitle: "App Name",
      //   notificationBody: "Location is used when App is in background",
      // },
      // showsBackgroundLocationIndicator: true,
    });
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TRACKING
    );
    setLocationStarted(hasStarted);
    console.log("tracking started?", hasStarted);
  };

  const foregroundLocationTracking = async () => {
    const currentLocation = await Location.getCurrentPositionAsync({});

    mutation.mutate({
      accuracy: currentLocation.coords.accuracy,
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    });
  };

  const startForgroundLocationTracking = async () => {
    setForgroundLocationStarted(true);
  };

  const stopLocation = () => {
    setLocationStarted(false);
    console.log("Stop location tracking!");
    TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING).then((tracking) => {
      if (tracking) {
        Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
      }
    });
  };

  useEffect(() => {
    const foregroundLocationInterval = setInterval(() => foregroundLocationTracking(), 1000 * 60 * 5);

    return () => {
      setForgroundLocationStarted(false);
      clearInterval(foregroundLocationInterval);
    };
  }, [forgroundLocationStarted]);

  useEffect(() => {
    if (token) {
      requestLocationPermission();
    }

    return () => {
      if (token) stopLocation();
    };
  }, [token]);

  return children;
}


TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
  if (error) {
    console.log("LOCATION_TRACKING task ERROR:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[]; };

    const accuracy = locations[0].coords?.accuracy;
    const latitude = locations[0].coords?.latitude;
    const longitude = locations[0].coords?.longitude;

    if (store.getState().login.token) {
      axios
        .put(
          `${API_URL}/api/agent/save-user-location`,
          { accuracy, latitude, longitude },
          {
            headers: {
              Authorization: `Bearer ${store.getState().login.token}`,
            },
          }
        )
        .then((_res) => console.log("Successfully stored location data!"))
        .catch((err) => console.error(err));
    }
  }
});

