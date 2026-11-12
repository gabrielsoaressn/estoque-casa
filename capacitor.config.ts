import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.estoquecasa.app",
  appName: "Estoque da Casa",
  webDir: "out",
  // Permite o assistente falar com o Ollama do PC pela rede local (http://IP:11434).
  server: { cleartext: true },
  android: { backgroundColor: "#0d0f0b", allowMixedContent: true },
};

export default config;
