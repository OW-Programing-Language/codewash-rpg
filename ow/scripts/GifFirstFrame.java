import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

/**
 * Convert the first frame of an original animated Minecraft mob GIF to PNG
 * during native packaging. Java 17 ImageIO is already available in the build.
 * No binary derivatives or third-party decoder are committed to the repo.
 */
public class GifFirstFrame {
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("source.gif destination.png");
        File source = new File(args[0]);
        File destination = new File(args[1]);
        if (!source.isFile() || !source.getName().endsWith(".gif"))
            throw new IllegalArgumentException("Source must be a readable GIF");
        BufferedImage frame = ImageIO.read(source);
        if (frame == null || frame.getWidth() < 1 || frame.getHeight() < 1)
            throw new IllegalArgumentException("Invalid GIF first frame: " + source);
        if (!ImageIO.write(frame, "png", destination))
            throw new IllegalStateException("No PNG encoder available");
    }
}
