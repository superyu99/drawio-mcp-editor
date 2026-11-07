# XML essentials — MCP named diagrams

Use `get_current_diagram(name)` before modifying an existing diagram and `update_diagram({name,xml})` after editing; `create_diagram` is for explicitly requested **new** canvases only.

## Minimal model

```xml
<mxGraphModel math="1" adaptiveColors="auto">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="a" value="Input" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
      <mxGeometry x="40" y="40" width="180" height="70" as="geometry"/>
    </mxCell>
    <mxCell id="b" value="Output" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
      <mxGeometry x="40" y="170" width="180" height="70" as="geometry"/>
    </mxCell>
    <mxCell id="e1" edge="1" source="a" target="b" parent="1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
```

- Unique IDs; vertex geometry has dimensions; edge geometry must **not** be omitted or self-closed at the `mxCell` level; children use relative coordinates within a container.
- Keep valid XML attributes and escape special characters in label values. For HTML labels use `html=1;whiteSpace=wrap;` and XML-escaped HTML.
- For math, keep `math="1"`, valid math delimiters and correctly sized node boxes. Prefer inline equations inside compact nodes; never silently alter mathematical meaning.
- Place by logical flow and content size, not a mandatory rigid grid. A practical start is 160–220 px wide boxes with 32–64 px between boxes. Check actual output.
- `postLayout:"elk"` relocates nodes; `routing:"libavoid"` modifies edge routes while keeping positions. For unavoidable routing defects, correct exit/entry anchors or add minimal `<Array as="points">` waypoints in XML; these are **allowed**, and a fresh snapshot must be checked.
- For swimlanes use `swimlane;startSize=24;`; containers own their children and nested edges belong to the nearest common ancestor of both endpoints.
- Mandatory QA: `get_snapshot(name)` → **open PNG visually** → reject cut-off formulas, overflowing text, node crossings, confusing joins, misalignments and excessive whitespace → revise **same** canvas with `update_diagram`.
