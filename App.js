import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import VideoCallScreen from './components/VideoCallScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const App = () => {
  const [roomID, setRoomID] = useState('');
  return (
    <View style={styles.container}>
      <VideoCallScreen roomID={roomID} setRoomID={setRoomID} />
    </View>
  );
};

export default App;
