export type AppTheme = {
  scheme: "light" | "dark";
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;

    primary: string;
    error: string;

    tabBarBg: string;
    tabBarBorder: string;
  };
};

export const lightTheme: AppTheme = {
  scheme: "light",
  colors: {
    bg: "#F6F7FB",
    surface: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    border: "rgba(15,23,42,0.10)",

    primary: "#3B82F6",
    error: "#EF4444",

    tabBarBg: "#FFFFFF",
    tabBarBorder: "rgba(15,23,42,0.10)",
  },
};

export const darkTheme: AppTheme = {
  scheme: "dark",
  colors: {
    bg: "#0A0A0A",          
    surface: "#121212",     
    text: "#F5F5F5",        
    muted: "#A3A3A3",       
    border: "rgba(255,255,255,0.10)",

    primary: "#3B82F6",
    error: "#EF4444",

    tabBarBg: "#0A0A0A",
    tabBarBorder: "rgba(255,255,255,0.10)",
  },
};

// old dark blue theme
// export const darkTheme: AppTheme = {
//   scheme: "dark",
//   colors: {
//     bg: "#070B12",
//     surface: "#0B1220",
//     text: "#F8FAFC",
//     muted: "#94A3B8",
//     border: "rgba(148,163,184,0.18)",

//     primary: "#3B82F6",
//     error: "#EF4444",

//     tabBarBg: "#0B1220",
//     tabBarBorder: "rgba(148,163,184,0.18)",
//   },
// };