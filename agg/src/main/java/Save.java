import agg.util.XMLHelper;
import agg.xt_basis.GraGra;

// Source agg_V21\Examples_V164\BasisUsing\AGGBasic\AGGBasicTest.java
public class Save {
    public static GraGra load(String fName) {
      XMLHelper h = new XMLHelper();
      if (h.read_from_xml(fName)) {
        GraGra gra =  new GraGra(true);
        h.getTopObject(gra);
        gra.setFileName(fName);
        return gra;
      } 
      return null;
    }

    public static void main( String[] args ) {
        if (args.length < 2) {
            System.out.println("Expected two arguments.");
            return;
        }
        String from = args[0];
        String to = args[1];
        System.out.println("Copying file from " + from + " to "+ to);
        load(from).save(to);
    }
}
