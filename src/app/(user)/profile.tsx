import { supabase } from "@lib/supabase";
import React from "react";
import { Button, Text, View } from "react-native";

const profile = () => {
  return (
    <View>
      <Text>Profile</Text>
      <Button
        title="Sign out"
        onPress={async () => await supabase.auth.signOut()}
      />
    </View>
  );
};

export default profile;
