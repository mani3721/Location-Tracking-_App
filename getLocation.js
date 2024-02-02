import { SafeAreaView, Text, View } from "react-native";
import styles from "./map.style";
import MapView, { Marker } from "react-native-maps";
import { useEffect, useState } from "react";
import { API_URL } from "../../utils/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";



export default function Map({ navigation, route }) {
    const [data, setData]=useState([])
    const [region, setRegion] = useState({
        latitude: 20.796559242349144,
        longitude: 81.50795050447246,
        latitudeDelta: 50, //0.0922 
        longitudeDelta: 27, //0.0421
    });

    const fetchData = async () => {
        try {
          let token = await AsyncStorage.getItem("token");
  
          let headers = {
            Authorization: `Bearer ${token}`,
          };
  
          const response = await axios.get(`${API_URL}/api/agent/get-location/${route.params.agentId}`, {
            headers,
          });

          console.log(response.data,"dataaaaa");
          setData(response.data)

          if(response.data?.[0]?.latLng) {
            setRegion({ latitude: response.data[0]?.latLng.latitude, latitudeDelta: 0.0922, longitude: response.data[0]?.latLng.longitude, longitudeDelta: 0.0421 })
          }
          
        } catch (error) {
          console.error("Error fetching datalst:", error);
        }
    };

    const handleRegionChange = (changedRegion) => {
        setRegion(changedRegion);
    }

    useEffect(() => {  
        fetchData();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
          <View>
          <MapView
            region={region}
            style={{
                width: "100%",
                height: "100%"
            }}
            onRegionChangeComplete={handleRegionChange}
            >
            {
                
               data?.map((marker, index)=>(
                <Marker
                    key={index}
                    coordinate={marker.latLng}
                    title={marker.title}
                    description={marker.description}
                />
               ))
            }
           
            </MapView>
          </View>
        </SafeAreaView>
    )
    
}
