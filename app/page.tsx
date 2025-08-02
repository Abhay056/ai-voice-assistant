import { ChatComponent } from "./components/ChatComponent";
import VoiceAssistant from "./components/VoiceAssistant";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <VoiceAssistant />
      <ChatComponent />
    </main>
  );
}
