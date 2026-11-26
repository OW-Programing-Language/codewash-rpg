package org.oreostudios.codewash;

import dev.oreo.RuntimeExtension;
import java.awt.Desktop;
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
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
    private final List<Clip> effects = new ArrayList<>();
    // Same theme-to-track mapping as the original Electron game.
    private static final String[][] TRACKS = {
        {"calm1", "calm2", "calm3"}, {"piano3", "calm3"},
        {"calm1", "piano1"}, {"piano1", "piano2"},
        {"piano1", "piano2", "piano3"}, {"calm2", "calm3", "piano2"}
    };
    private final ScheduledExecutorService notes = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "codewash-pattern-audio");
        thread.setDaemon(true);
        return thread;
    });
    private final List<ScheduledFuture<?>> pendingNotes = new ArrayList<>();
    private long noteGeneration;

    @Override
    public boolean supports(String operation) {
        return "system.open_url".equals(operation)
            || "system.audio.play_bgm".equals(operation)
            || "system.audio.set_volume".equals(operation)
            || "system.audio.stop_bgm".equals(operation)
            || "system.audio.start_music".equals(operation)
            || "system.audio.effect".equals(operation)
            || "system.audio.mob".equals(operation)
            || "system.audio.note".equals(operation)
            || "system.audio.pattern".equals(operation)
            || "system.audio.cancel_pattern".equals(operation);
    }

    @Override
    public synchronized Object invoke(String operation, List<Object> arguments) {
        switch (operation) {
            case "system.open_url": return openUrl(arguments);
            case "system.audio.play_bgm": return playBgm(arguments);
            case "system.audio.set_volume": return setVolume(arguments);
            case "system.audio.stop_bgm": return stopBgm();
            case "system.audio.start_music":
                int theme = arguments.isEmpty() ? 0 : intArg(arguments, 0, "theme");
                if (theme < 0 || theme >= TRACKS.length) return 0;
                String[] choices = TRACKS[theme];
                return playBgm(List.of("bgm/" + choices[ThreadLocalRandom.current().nextInt(choices.length)] + ".wav"));
            case "system.audio.effect": return playEffect("ui/ui/" + stringArg(arguments, 0, "effect") + ".wav");
            case "system.audio.mob": return playMob(stringArg(arguments, 0, "mob"), stringArg(arguments, 1, "event"));
            case "system.audio.note": return playNote(stringArg(arguments, 0, "color"));
            case "system.audio.pattern": return playPattern(stringArg(arguments, 0, "pattern"));
            case "system.audio.cancel_pattern": return cancelPattern();
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
            File file = audioFile(path);
            if (file == null) return 0;
            stopBgm();
            Clip clip = loadClip(file);
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
        for (Clip effect : effects) applyGain(effect);
        return 1;
    }

    private int stopBgm() {
        if (bgm != null) {
            try { bgm.stop(); bgm.close(); } catch (Exception ignored) {}
            bgm = null;
        }
        return 1;
    }

    private static File audioFile(String relative) throws java.io.IOException {
        Path base = Path.of("assets", "sounds").toRealPath();
        Path requested = base.resolve(relative).normalize();
        if (!requested.startsWith(base) || !relative.endsWith(".wav") || !Files.isRegularFile(requested)) return null;
        Path actual = requested.toRealPath();
        return actual.startsWith(base) ? actual.toFile() : null;
    }

    private static Clip loadClip(File file) throws Exception {
        Clip clip = AudioSystem.getClip();
        try (AudioInputStream stream = AudioSystem.getAudioInputStream(file)) {
            clip.open(stream);
            return clip;
        } catch (Exception failure) {
            clip.close();
            throw failure;
        }
    }

    private int playEffect(String path) {
        if (volume == 0) return 1;
        try {
            File file = audioFile(path);
            if (file == null) return 0;
            effects.removeIf(clip -> {
                if (clip.isRunning()) return false;
                clip.close();
                return true;
            });
            if (effects.size() >= 8) effects.remove(0).close();
            Clip clip = loadClip(file);
            effects.add(clip);
            applyGain(clip);
            clip.start();
            return 1;
        } catch (Exception unavailable) {
            return 0;
        }
    }

    private int playMob(String name, String event) {
        if (!event.equals("hurt") && !event.equals("death")) return 0;
        String key = name.toLowerCase(Locale.ROOT).replace(" ", "");
        if (key.equals("enderman")) key = "endermen";
        if (key.equals("witherskeleton")) key = "wither_skeleton";
        if (!key.matches("[a-z_]+")) return 0;
        return playEffect("mob/mob/" + key + "/" + event + ".wav");
    }

    private int playNote(String color) {
        String note = switch (color) {
            case "RED" -> "c4"; case "BLUE" -> "d4"; case "GREEN" -> "e4";
            case "YELLOW" -> "f4"; case "PURPLE" -> "g4"; case "ORANGE" -> "a4";
            default -> "";
        };
        return note.isEmpty() ? 0 : playEffect("axolotl/" + note + ".wav");
    }

    private int cancelPattern() {
        noteGeneration++;
        for (ScheduledFuture<?> note : pendingNotes) note.cancel(false);
        pendingNotes.clear();
        return 1;
    }

    private int playPattern(String pattern) {
        cancelPattern();
        long generation = noteGeneration;
        String[] colors = pattern.trim().split("\\s+");
        int offset = 0;
        for (String color : colors) {
            if (color.equals("?") || offset >= 12) break;
            pendingNotes.add(notes.schedule(() -> {
                synchronized (this) {
                    if (generation == noteGeneration) playNote(color);
                }
            }, offset++ * 320L, TimeUnit.MILLISECONDS));
        }
        return offset > 0 ? 1 : 0;
    }

    private void applyVolume() {
        if (bgm != null) applyGain(bgm);
    }

    private void applyGain(Clip clip) {
        try {
            if (clip.isControlSupported(javax.sound.sampled.BooleanControl.Type.MUTE)) {
                ((javax.sound.sampled.BooleanControl) clip.getControl(javax.sound.sampled.BooleanControl.Type.MUTE)).setValue(volume == 0);
            }
            if (clip.isControlSupported(FloatControl.Type.MASTER_GAIN)) {
                FloatControl gain = (FloatControl) clip.getControl(FloatControl.Type.MASTER_GAIN);
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
    public synchronized void close() {
        cancelPattern();
        notes.shutdownNow();
        stopBgm();
        for (Clip effect : effects) effect.close();
        effects.clear();
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
