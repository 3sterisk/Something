//  this is the main implementaition of the room functionality
// Current issue It is showing Room does Not exist even after entering correct RoomID

import React, {useState, useEffect, useRef} from 'react';
import {View, TextInput, Dimensions} from 'react-native';
import {
  RTCView,
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';
import {firebase} from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';

import ButtonComponent from './ButtonComponent';

const VideoCallScreen = ({roomID, setRoomID}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [isRoomJoined, setIsRoomJoined] = useState(false);
  const [showLocalStream, setShowLocalStream] = useState(false);

  useEffect(() => {
    // Request permission to access camera and microphone
    mediaDevices
      .getUserMedia({
        audio: true,
        video: true,
      })
      .then(stream => {
        // Set the local stream
        setLocalStream(stream);
      })
      .catch(error => {
        console.log('Error accessing media devices:', error);
      });
  }, []);

  const initializePeerConnection = () => {
    console.log('Before initializing peer connection');
    const configuration = {
      iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
    };
    const pc = new RTCPeerConnection(configuration);

    pc.ontrack = handleRemoteTrack;
    pc.onicecandidate = handleICECandidate;

    console.log('Initialized peer connection:', pc);
    console.log('After initializing peer connection');

    setPeerConnection(pc);
  };

  useEffect(() => {
    console.log('peerConnection value:', peerConnection);

    // Perform any actions that require the updated peerConnection value here
  }, [peerConnection]);

  const handleICECandidate = event => {
    if (event.candidate) {
      // Send the ICE candidate to the other peer using Firestore
      const candidate = event.candidate.toJSON();
      console.log('Sending ICE candidate:', candidate);
      firestore()
        .collection('rooms')
        .doc(roomID)
        .collection('candidates')
        .add(candidate)
        .then(() => {
          console.log('ICE candidate sent successfully');
        })
        .catch(error => {
          console.log('Error sending ICE candidate:', error);
        });
    }
  };

  const handleRemoteTrack = event => {
    if (event.streams && event.streams[0]) {
      // Set the remote stream
      setRemoteStream(event.streams[0]);
    }
  };

  const handleSignalingData = async ({type, sdp, candidate}) => {
    try {
      if (type === 'offer') {
        console.log('Received SDP offer:', sdp);

        // Set the remote description (SDP) for the joining person
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(sdp),
        );

        // Create an answer and set it as the local description
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send the answer (SDP) to the signaling server
        sendSignalingData({
          type: 'answer',
          sdp: peerConnection.localDescription,
        });
      } else if (type === 'answer') {
        console.log('Received SDP answer:', sdp);

        // Set the remote description (SDP) for the joining person
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(sdp),
        );
      } else if (type === 'candidate') {
        console.log('Received ICE candidate:', candidate);

        // Add the ICE candidate received from the joining person
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.log('Error handling signaling data:', error);
    }
  };

  const handleRemoteSDP = async data => {
    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data),
      );
      if (data.type === 'offer') {
        // Create an SDP answer and set it as the local description
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send the SDP answer to the other peer using Firestore
        console.log(
          'Sending SDP answer:',
          peerConnection.localDescription.toJSON(),
        );
        firestore()
          .collection('rooms')
          .doc(roomID)
          .set({sdp: peerConnection.localDescription.toJSON()})
          .then(() => {
            console.log('SDP answer sent successfully');
          })
          .catch(error => {
            console.log('Error sending SDP answer:', error);
          });
      }
    } catch (error) {
      console.log('Error setting remote description:', error);
    }
  };

  const handleRemoteICECandidate = candidate => {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnection
      .addIceCandidate(iceCandidate)
      .then(() => {
        console.log('ICE candidate added successfully');
      })
      .catch(error => {
        console.log('Error adding ICE candidate:', error);
      });
  };

  const generateRoomID = () => {
    // Generate a random room ID
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 8;
    let roomID = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      roomID += characters.charAt(randomIndex);
    }
    return roomID;
  };

  // Inside createRoom function
  // ...
  const createRoom = async () => {
    if (roomID.trim() !== '') {
      try {
        console.log('Before initializing peer connection');
        const configuration = {
          iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
        };
        const pc = new RTCPeerConnection(configuration);

        pc.ontrack = handleRemoteTrack;

        console.log('Initialized peer connection:', pc);
        console.log('After initializing peer connection');

        setPeerConnection(pc);

        try {
          if (mediaDevices && mediaDevices.getUserMedia) {
            const stream = await mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            setLocalStream(stream);
            setShowLocalStream(true); // Show the local stream

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            console.log('Room created successfully!');
            alert('Room created successfully!'); // Display success message
          } else {
            console.log('getUserMedia is not supported');
          }
        } catch (error) {
          console.log('Error creating room:', error);
          alert('Error creating room: ' + error.message); // Display error message
        }
      } catch (error) {
        console.log('Error initializing peer connection:', error);
      }
    } else {
      console.log('Please enter a valid room ID');
    }
  };

  const joinRoom = () => {
    if (roomID) {
      // Initialize the peer connection and start listening for signaling messages
      console.log('Initializing peer connection...');
      initializePeerConnection(); // Move the initialization here

      firestore()
        .collection('rooms')
        .doc(roomID)
        .get()
        .then(doc => {
          if (doc.exists) {
            console.log('Room exists');
            setIsRoomJoined(true);

            firestore()
              .collection('rooms')
              .doc(roomID)
              .collection('candidates')
              .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                  if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data) {
                      console.log('Received ICE candidate:', data);
                      handleSignalingData({candidate: data});
                    }
                  }
                });
              });
            firestore()
              .collection('rooms')
              .doc(roomID)
              .onSnapshot(doc => {
                const data = doc.data();
                if (data && data.sdp) {
                  console.log('Received SDP offer:', data.sdp);
                  handleSignalingData({type: 'offer', sdp: data.sdp});
                }
              });

            // Get the local stream if it's not already available
            if (!localStream) {
              console.log('Getting local stream...');
              mediaDevices
                .getUserMedia({audio: true, video: true})
                .then(stream => {
                  setLocalStream(stream);
                  setShowLocalStream(true); // Show the local stream
                })
                .catch(error => {
                  console.log('Error accessing media devices:', error);
                });
            }

            console.log('Joining room successfully!');
            alert('Joining room successfully!'); // Display success message
          } else {
            console.log('Room does not exist');
            alert('Room does not exist'); // Display error message
            setIsRoomJoined(false);
          }
        })
        .catch(error => {
          if (error.code === 'unavailable') {
            console.log(
              'Firestore service is currently unavailable. Please try again later.',
            );
            alert(
              'Firestore service is currently unavailable. Please try again later.',
            ); // Display error message
          } else {
            console.log('Error joining room:', error);
            alert('Error joining room: ' + error.message); // Display error message
          }
        });
    } else {
      console.log('Please enter a valid room ID');
    }
  };

  const deleteAllRooms = async () => {
    try {
      // Close the peer connection
      if (peerConnection) {
        peerConnection.close();
      }

      // Stop the local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      // Reset the local and remote streams, and room ID
      setLocalStream(null);
      setRemoteStream(null);
      setRoomID('');

      // Delete all documents in the 'rooms' collection
      await firestore()
        .collection('rooms')
        .get()
        .then(snapshot => {
          const batch = firestore().batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          return batch.commit();
        });

      console.log('All rooms deleted successfully!');
      alert('All rooms deleted successfully!'); // Display success message
    } catch (error) {
      console.log('Error deleting rooms:', error);
      alert('Error deleting rooms: ' + error.message); // Display error message
    }
  };

  const renderVideo = (stream, isLocal) => {
    if (stream) {
      return (
        <RTCView
          streamURL={stream && stream.toURL()}
          style={{flex: 1, width: Dimensions.get('window').width}}
        />
      );
    }
    return null;
  };

  return (
    <View style={{flex: 1}}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}>
        {remoteStream && renderVideo(remoteStream, false)}
        {localStream && showLocalStream && renderVideo(localStream, true)}
      </View>
      <TextInput
        value={roomID}
        onChangeText={text => setRoomID(text)}
        placeholder="Enter room ID"
        style={{
          borderWidth: 1,
          padding: 10,
          margin: 10,
          width: '80%',
          alignSelf: 'center', // Center the TextInput horizontally
        }}
      />
      <View style={{flexDirection: 'row', justifyContent: 'center'}}>
        <ButtonComponent
          title="Create Room"
          onPress={createRoom}
          style={{marginRight: 10}} // Add margin to create space between buttons
        />
        <ButtonComponent
          title="Join Room"
          onPress={joinRoom}
          style={{marginLeft: 10, marginRight: 10}} // Add margin to create space between buttons
        />
      </View>
      <View style={{alignItems: 'center'}}>
        <ButtonComponent
          title="Delete All Rooms"
          onPress={deleteAllRooms}
          style={{color: 'red'}} // Set the color to red
        />
      </View>
      {isRoomJoined ? (
        <Text style={{textAlign: 'center', marginBottom: 10}}>
          Room joined successfully!
        </Text>
      ) : null}
    </View>
  );
};

export default VideoCallScreen;
