import dev.oreo.GameMain;
import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import javax.imageio.ImageIO;

public class GuiSmoke {
    static java.util.List<Component> all = new ArrayList<>();
    static void collect(Component c) {
        all.add(c);
        if (c instanceof Container p) for (Component child : p.getComponents()) collect(child);
    }
    static JFrame frame() {
        for (Frame f : Frame.getFrames()) if (f.isVisible() && f instanceof JFrame j) return j;
        return null;
    }
    static void inspect() {
        all.clear(); collect(frame());
    }
    public static void main(String[] args) throws Exception {
        AtomicReference<Throwable> failure = new AtomicReference<>();
        Thread game = new Thread(() -> {
            try { GameMain.main(new String[0]); } catch (Throwable t) { failure.set(t); }
        });
        game.start();
        try {
            for (int i = 0; i < 100; i++) {
                if (failure.get() != null) throw new AssertionError(failure.get());
                Thread.sleep(100);
                AtomicReference<Boolean> ready = new AtomicReference<>(false);
                SwingUtilities.invokeAndWait(() -> {
                    if (frame() != null) {
                        inspect();
                        ready.set(all.stream().anyMatch(c -> c instanceof JTextField));
                    }
                });
                if (ready.get()) break;
            }
            SwingUtilities.invokeAndWait(() -> {
                if (frame() == null) throw new AssertionError("No native window");
                inspect();
                long icons = all.stream().filter(c -> c instanceof JLabel l && l.getIcon() != null).count();
                if (icons != 3) throw new AssertionError("Expected 3 original images, found " + icons);
                if (all.stream().anyMatch(c -> c instanceof JLabel l && l.getText() != null && l.getText().startsWith("[image:")))
                    throw new AssertionError("Missing image placeholder");
                for (Component c : all) if (c instanceof JTextField input) {
                    input.setText("wrong-answer"); input.postActionEvent(); break;
                }
                inspect();
                boolean reacted = all.stream().anyMatch(c -> c instanceof JLabel l && l.getText() != null && l.getText().contains("Not quite"));
                if (!reacted) throw new AssertionError("Input handler failed");
                String scrambled = all.stream().filter(c -> c instanceof JLabel l && l.getText() != null && l.getText().startsWith("Unscramble:")).map(c -> ((JLabel)c).getText().substring(11).trim().toLowerCase()).findFirst().orElseThrow();
                String answer = Arrays.stream(new String[]{"cat","dog","sun","hat","red","big","book","tree","fish","ball","star","moon"})
                    .filter(w -> w.chars().sorted().boxed().toList().equals(scrambled.chars().sorted().boxed().toList())).findFirst().orElseThrow();
                for (Component c : all) if (c instanceof JTextField input) { input.setText(answer); input.postActionEvent(); break; }
                inspect();
                if (!all.stream().anyMatch(c -> c instanceof JLabel l && l.getText() != null && l.getText().startsWith("Hit!")))
                    throw new AssertionError("Correct answer did not damage foe");
                for (Component c : all) if (c instanceof JButton b && b.getText().equals("New foe")) { b.doClick(); break; }
                inspect();
                if (!all.stream().anyMatch(c -> c instanceof JLabel l && "New foe!".equals(l.getText())))
                    throw new AssertionError("New foe handler failed");
                JFrame f = frame();
                BufferedImage image = new BufferedImage(f.getWidth(), f.getHeight(), BufferedImage.TYPE_INT_RGB);
                Graphics2D g = image.createGraphics(); f.paint(g); g.dispose();
                try { ImageIO.write(image, "png", Path.of(args[0]).toFile()); } catch (Exception e) { throw new RuntimeException(e); }
                System.out.println("PASS: native UI, three original images, wrong and correct answers, combat damage, new foe button");
            });
        } finally {
            SwingUtilities.invokeAndWait(() -> { for (Frame f : Frame.getFrames()) f.dispose(); });
            game.join(5000);
        }
        if (failure.get() != null) throw new AssertionError(failure.get());
    }
}
