package org.oreostudios.codewash;

import javax.swing.BorderFactory;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JWindow;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GraphicsEnvironment;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Tiny platform-native jpackage entrypoint. No Git, Node, Maven, downloads or
 * compiler builds at runtime. The OW interpreter and LWJGL provider are already
 * compiled and all @alias imports live under payload/ow/.ow/deps.
 *
 * The second JVM is intentional: GLFW/OW Graphics resolves textures against
 * the process working directory, while jpackage's launcher starts from an
 * arbitrary location. ProcessBuilder sets cwd to the bundled OW project, and
 * uses the SAME bundled runtime as the outer launcher.
 */
public final class NativeLauncher {
    private static final String BANNER = "CodeWash RPG / experimental GPU math battle";
    private static final List<String> ALIASES =
            List.of("math", "flow", "owunit", "graphics", "engine");

    private NativeLauncher() {}

    public static void main(String[] args) throws Exception {
        Path appDir = appDirectory();
        String mode = args.length == 0 ? "run" : args[0];
        if (!List.of("run", "--self-test", "--check", "--smoke").contains(mode)) {
            System.err.println("Usage: CodeWashRPG [--self-test|--check|--smoke]");
            System.exit(2);
            return;
        }
        Path root = appDir.resolve("payload").resolve("ow");
        validate(appDir, root);
        if ("--self-test".equals(mode)) {
            System.out.println("PASS: packaged native OW runtime, dependencies and assets");
            return;
        }

        // The splash is visible before OW source loading and GLFW initialization,
        // and disappears ONLY after the game reports its first ready window.
        AtomicBoolean ready = new AtomicBoolean(false);
        JWindow splash = "run".equals(mode) ? showSplash() : null;
        String script = "--smoke".equals(mode)
                ? "src/engine/battle_lifecycle_smoke.ow"
                : "src/engine/battle_gpu.ow";
        String action = "--check".equals(mode) ? "check" : "run";
        Path java = Path.of(System.getProperty("java.home"), "bin",
                isWindows() ? "javaw.exe" : "java");
        if (!Files.isRegularFile(java)) {
            throw new IllegalStateException("Bundled Java runtime not found: " + java);
        }

        String classpath = appDir.resolve("OwIDE.jar")
                + System.getProperty("path.separator") + appDir.resolve("ow-graphics-native.jar")
                + System.getProperty("path.separator") + appDir.resolve("lib").resolve("*");
        List<String> cmd = new ArrayList<>();
        cmd.add(java.toString());
        if (isMac()) cmd.add("-XstartOnFirstThread"); // mandatory for Cocoa GLFW
        cmd.add("-Xms64m");
        cmd.add("-Xmx768m");
        cmd.add("-Dfile.encoding=UTF-8");
        cmd.add("-cp");
        cmd.add(classpath);
        cmd.add("dev.oreo.Main");
        cmd.add(action);
        cmd.add(script);
        Process process;
        try {
            process = new ProcessBuilder(cmd).directory(root.toFile())
                    .redirectErrorStream(true).start();
        } catch (IOException error) {
            closeSplash(splash);
            throw error;
        }

        // Drain merged stdout/stderr to prevent blocked child IO. Ready signal
        // is emitted by battle_gpu.ow only AFTER preview.start() succeeds.
        Thread pump = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println(line);
                    if (!ready.get() && line.contains(BANNER)) {
                        ready.set(true);
                        closeSplash(splash);
                    }
                }
            } catch (IOException error) {
                System.err.println("OW game output: " + error.getMessage());
            }
        }, "ow-native-output");
        pump.setDaemon(true);
        pump.start();
        int exitCode;
        try {
            exitCode = process.waitFor();
            pump.join();
        } finally {
            closeSplash(splash);
        }
        if (exitCode != 0) System.exit(exitCode);
    }

    static void validate(Path appDir, Path root) throws IOException {
        for (String name : List.of("native-launcher.jar", "OwIDE.jar",
                "ow-graphics-native.jar")) {
            required(appDir.resolve(name));
        }
        Path libs = appDir.resolve("lib");
        if (!Files.isDirectory(libs)) throw new IOException("Missing native libs: " + libs);
        try (var contents = Files.list(libs)) {
            if (contents.noneMatch(p -> p.toString().endsWith(".jar"))) {
                throw new IOException("No LWJGL native jars in " + libs);
            }
        }
        required(root.resolve("src/engine/battle_gpu.ow"));
        required(root.resolve("src/engine/battle_lifecycle_smoke.ow"));
        required(root.resolve("dependencies.yml"));
        required(root.resolve("dependencies.lock.yml"));
        for (String alias : ALIASES) {
            Path marker = root.resolve(".ow/deps").resolve(alias).resolve(".ow-resolved");
            required(marker);
            if (!Files.readString(marker).trim().matches("[0-9a-f]{40}")) {
                throw new IOException("Invalid bundled OW dependency revision: " + alias);
            }
        }
        required(root.resolve("assets/native/skills/math_icon.png"));
        required(root.resolve("assets/native/items/egg.png"));
    }

    private static void required(Path file) throws IOException {
        if (!Files.isRegularFile(file)) {
            throw new IOException("Incomplete native package, missing: " + file);
        }
    }

    private static Path appDirectory() throws Exception {
        Path jar = Path.of(NativeLauncher.class.getProtectionDomain()
                .getCodeSource().getLocation().toURI());
        if (!Files.isRegularFile(jar)) {
            throw new IllegalStateException("Run CodeWashRPG from its installed app-image");
        }
        return jar.toAbsolutePath().normalize().getParent();
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    private static boolean isMac() {
        return System.getProperty("os.name", "").toLowerCase().contains("mac");
    }

    private static JWindow showSplash() {
        if (GraphicsEnvironment.isHeadless()) return null;
        final JWindow[] result = new JWindow[1];
        try {
            SwingUtilities.invokeAndWait(() -> {
                JWindow window = new JWindow();
                JPanel content = new JPanel(new BorderLayout(0, 12));
                content.setBackground(new Color(15, 24, 39));
                content.setBorder(BorderFactory.createEmptyBorder(25, 34, 25, 34));
                JLabel title = new JLabel("CODEWASH RPG", SwingConstants.CENTER);
                title.setForeground(new Color(223, 239, 250));
                title.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 26));
                JLabel hint = new JLabel("Loading OW Engine + OW Graphics...",
                        SwingConstants.CENTER);
                hint.setForeground(new Color(151, 183, 204));
                JProgressBar spinner = new JProgressBar();
                spinner.setIndeterminate(true);
                content.add(title, BorderLayout.NORTH);
                content.add(hint, BorderLayout.CENTER);
                content.add(spinner, BorderLayout.SOUTH);
                window.setContentPane(content);
                window.setSize(new Dimension(470, 170));
                window.setLocationRelativeTo(null);
                window.setVisible(true);
                result[0] = window;
            });
        } catch (Exception error) {
            System.err.println("Splash unavailable: " + error.getMessage());
        }
        return result[0];
    }

    private static void closeSplash(JWindow window) {
        if (window != null) {
            SwingUtilities.invokeLater(() -> {
                if (window.isDisplayable()) window.dispose();
            });
        }
    }
}
