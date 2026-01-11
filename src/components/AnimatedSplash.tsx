import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import LottieView from "lottie-react-native";

export default function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const t = setTimeout(finish, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.wrap}>
      <LottieView
        source={require("../../assets/images/splash-lottie.json")}
        autoPlay
        loop={false}
        onAnimationFinish={finish}
        style={{ width: 240, height: 240 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#09133c",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
});
