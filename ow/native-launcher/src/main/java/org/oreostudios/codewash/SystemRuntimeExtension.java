package org.oreostudios.codewash;

import dev.oreo.RuntimeExtension;
import java.awt.Desktop;
import java.io.File;
import java.net.URI;
import java.util.List;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.Clip;
import javax.sound.sampled.FloatControl;

/**
 * CodeWash-owned native system capabilities exposed to OW through the
 * ServiceLoader RuntimeExtension SPI (registered in META-INF/services). These
 * are app concerns the graphics bridge does not cover:
 *
 *  - system.open_url(url): open the bug-report issue page in the user's
 *    browser. User-initiated only; the offline game makes no network calls.
 *  - system.audio.play_bgm(path) / set_volume(percent) / stop_bgm(): a looping
 *    background-music mixer with a live master-gain volume so the Settings
 *    volume slider actually changes what the player hears.
 */
public final class SystemRuntimeExtension implements RuntimeExtension {
    private Clip bgm;
    private float volume = 0.5f;

    @Override
    public boolean supports(String operation) {
        return "system.open_url".equals(operation)
            || "system.audio.play_bgm".equals(operation)
            || "system.audio.set_volume".equals(operation)
            || "system.audio.stop_bgm".equals(operation);
    }

    @Override
    public Object invoke(String operation, List<Object> arguments) {
        switch (operation) {
            case "system.open_url": return openUrl(arguments);
            case "system.audio.play_bgm": return playBgm(arguments);
            case "system.audio.set_volume": return setVolume(arguments);
            case "system.audio.stop_bgm": return stopBgm();
            default: throw new IllegalArgumentException("Unsupported system op: " + operation);
        }
    }

    private int openUrl(List<Object> args) {
        String url = stringArg(args, 0, "url");
        if (!url.startsWith("http://") && !url.startsWith("https://"))
            throw new IllegalArgumentException("system.open_url requires an http(s) URL");
        try {
            if (Desktop.isDesktopSupported()
                    && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(new URI(url));
                return 1;
            }
            String os = System.getProperty("os.name", "").toLowerCase();
            ProcessBuilder launcher;
            if (os.contains("win")) {
                launcher = new ProcessBuilder("rundll32", "url.dll,FileProtocolHandler", url);
            } else if (os.contains("mac")) {
                launcher = new ProcessBuilder("open", url);
            } else {
                launcher = new ProcessBuilder("xdg-open", url);
            }
            launcher.start();
            return 1;
        } catch (Exception error) {
            return 0;
        }
    }

    private int playBgm(List<Object> args) {
        String path = stringArg(args, 0, "bgm path");
        try {
            File file = new File(path);
            if (!file.isFile()) return 0;
            stopBgm();
            AudioInputStream stream = AudioSystem.getAudioInputStream(file);
            Clip clip = AudioSystem.getClip();
            clip.open(stream);
            this.bgm = clip;
            applyVolume();
            clip.loop(Clip.LOOP_CONTINUOUSLY);
            return 1;
        } catch (Exception error) {
            return 0;
        }
    }

    private int setVolume(List<Object> args) {
        int percent = intArg(args, 0, "volume percent");
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        this.volume = percent / 100.0f;
        applyVolume();
        return 1;
    }

    private int stopBgm() {
        if (bgm != null) {
            try { bgm.stop(); bgm.close(); } catch (Exception ignored) {}
            bgm = null;
        }
        return 1;
    }

    private void applyVolume() {
        if (bgm == null) return;
        try {
            if (bgm.isControlSupported(FloatControl.Type.MASTER_GAIN)) {
                FloatControl gain = (FloatControl) bgm.getControl(FloatControl.Type.MASTER_GAIN);
                float decibels = volume <= 0.0001f
                        ? gain.getMinimum()
                        : (float) (20.0 * Math.log10(volume));
                if (decibels < gain.getMinimum()) decibels = gain.getMinimum();
                if (decibels > gain.getMaximum()) decibels = gain.getMaximum();
                gain.setValue(decibels);
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void close() {
        stopBgm();
    }

    private static String stringArg(List<Object> args, int index, String label) {
        if (args == null || args.size() <= index || !(args.get(index) instanceof String value))
            throw new IllegalArgumentException(label + " must be a string");
        return value;
    }

    private static int intArg(List<Object> args, int index, String label) {
        if (args != null && args.size() > index && args.get(index) instanceof Number number)
            return number.intValue();
        throw new IllegalArgumentException(label + " must be a number");
    }
}
