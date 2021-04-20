import React from "react";
import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import "firebase/analytics";
import { v4 } from "uuid";

import CssBaseline from "@material-ui/core/CssBaseline";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";

import { useCollectionData } from "react-firebase-hooks/firestore";

firebase.initializeApp({
  apiKey: "AIzaSyBnx4aisChaY4rOJp4EBkJLL0Y-3pdSACc",
  authDomain: "webrtc-meet-5675f.firebaseapp.com",
  projectId: "webrtc-meet-5675f",
  storageBucket: "webrtc-meet-5675f.appspot.com",
  messagingSenderId: "830666454636",
  appId: "1:830666454636:web:6430c0c3d1184037158a49",
});

// const auth = firebase.auth();
const firestore = firebase.firestore();
// const analytics = firebase.analytics();

const SIZE = 300;

let peer;
// let imCaller = false;

export const App = () => {
  const [uniqName] = React.useState(v4());
  const videoRef = React.useRef(null);
  const remoteVideoRef = React.useRef(null);
  const [video, setVideo] = React.useState(false);
  const [calling, setCalling] = React.useState(false);

  const iceCandidatesRef = firestore.collection("iceCandidates");
  const [iceCandidates] = useCollectionData(iceCandidatesRef);

  const offersRef = firestore.collection("offers");
  const [offers] = useCollectionData(offersRef);

  const answersRef = firestore.collection("answers");
  const [answers] = useCollectionData(answersRef);

  const [savedOffers, setSavedOffers] = React.useState([]);

  const handleShowCamera = () => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });
      setVideo(true);
    });
  };

  const handleCall = () =>
    peer.createOffer({ offerToReceiveVideo: true }).then((offer) => {
      peer.setLocalDescription(offer).then(() => {
        setCalling(true);
        offersRef.add({
          name: uniqName,
          offer: JSON.stringify(offer),
        });
      });
    });

  const handleSaveOffers = () => {
    if (!offers) return;

    offers.forEach(({ name, offer }) => {
      if (name === uniqName) {
        // console.log("My offer");
        return;
      }

      // console.log("save remote offer");
      peer.setRemoteDescription(JSON.parse(offer));

      peer.createAnswer().then((answer) => {
        peer.setLocalDescription(answer);
        answersRef.add({
          name: uniqName,
          offer: JSON.stringify(answer),
        });
      });
    });
  };

  const handleSaveAnswers = () => {
    if (!answers) return;

    answers.forEach(({ name, offer }) => {
      if (name === uniqName) {
        // console.log("My answer");
        return;
      }

      if (savedOffers.includes(name)) {
        // console.log("Already exist");
        return;
      }

      // console.log("save remote answer");
      peer.setRemoteDescription(JSON.parse(offer));

      // if (imCaller) return;

      // peer.createAnswer().then((answer) => {
      //   console.log("create and store locale answer");
      //   peer.setLocalDescription(answer);
      //   console.log("send answer");
      //   setSavedOffers((array) => {
      //     answersRef.add({
      //       name: uniqName,
      //       offer: JSON.stringify(answer),
      //     });

      //     return [...array, name];
      //   });
      // });
    });
  };

  const handleSaveIceCandidates = () => {
    if (!iceCandidates) return;

    iceCandidates
      .filter(({ name }) => name !== uniqName)
      .forEach((item) => {
        console.log(`item.name: ${item.name}, my.name${uniqName}`);
        peer.addIceCandidate(JSON.parse(item.candidate));
      });
  };

  const handleAddNewConnection = () => {
    peer = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    peer.addEventListener("icecandidate", ({ candidate }) => {
      if (candidate) {
        // console.log("sendIceCandidate", JSON.stringify(candidate, null, 2));
        iceCandidatesRef.add({
          name: uniqName,
          candidate: JSON.stringify(candidate),
        });
      }
    });

    peer.addEventListener("track", ({ streams }) => {
      const [stream] = streams;
      if (!remoteVideoRef.current) return;

      // console.log("added remote video stream", stream);
      // console.log("remoteVideoRef", remoteVideoRef);
      remoteVideoRef.current.srcObject = stream;
    });
  };

  React.useEffect(handleAddNewConnection, []);
  React.useEffect(handleSaveOffers, [offers?.length]);
  React.useEffect(handleSaveAnswers, [answers?.length]);
  React.useEffect(handleSaveIceCandidates, [iceCandidates?.length]);

  return (
    <div>
      <CssBaseline />
      <Grid container justify="center" spacing={2}>
        <Grid item xs={12} container justify="center">
          <div
            style={{
              background: "black",
              position: "relative",
              width: "fit-content",
            }}
          >
            <div
              style={{
                background: "gray",
                position: "absolute",
                top: 0,
                right: 0,
              }}
            >
              <video
                autoPlay
                ref={remoteVideoRef}
                style={{ width: SIZE / 3, height: SIZE / 3 }}
              />
            </div>
            <video
              autoPlay
              ref={videoRef}
              style={{ width: SIZE, height: SIZE }}
            />
          </div>
        </Grid>
        <Grid item xs="auto">
          <Button
            variant="contained"
            color="primary"
            onClick={handleShowCamera}
            disabled={video}
          >
            Connect camera
          </Button>
        </Grid>
        <Grid item xs="auto">
          <Button
            variant="contained"
            color="primary"
            onClick={handleCall}
            disabled={!video || calling}
          >
            Call
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};
