import agg.util.XMLHelper;
import agg.xt_basis.GraGra;
import agg.xt_basis.GraTraEvent;
import agg.xt_basis.LayeredGraTraImpl;
import agg.xt_basis.GraTraEventListener;

// Source agg_V21\Examples_V164\BasisUsing\AGGBasic\AGGBasicTest.java
public class TransformLayered implements GraTraEventListener {
    public static GraGra load(String fName) {
        XMLHelper h = new XMLHelper();
        if (h.read_from_xml(fName)) {
            GraGra gra = new GraGra(true);
            h.getTopObject(gra);
            gra.setFileName(fName);
            return gra;
        }
        return null;
    }

    public static void main(String[] args) {
        if (args.length < 2) {
            System.out.println("Expected two arguments.");
            return;
        }
        String from = args[0];
        String to = args[1];

        System.out.println("Loading file " + from);
        GraGra graphGrammar = load(from);
        LayeredGraTraImpl gratraDefault = new LayeredGraTraImpl();
        gratraDefault.setGraGra(graphGrammar);
        gratraDefault.setHostGraph(graphGrammar.getGraph());
        gratraDefault.setGraTraOptions(graphGrammar.getGraTraOptions());
        System.out.println("Transform layered:  " + graphGrammar.getName());
        gratraDefault.transform();

        System.out.println("Saving result to " + to);
        graphGrammar.save(to);
    }

    @Override
    public void graTraEventOccurred(GraTraEvent arg0) {
        // TODO Auto-generated method stub

    }
}
