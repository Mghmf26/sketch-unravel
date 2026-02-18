

# EPC Business Process Diagram Tool

A web-based tool for manually inputting, visualizing, and exporting EPC (Event-driven Process Chain) business process diagrams — no AI, no external services, fully free.

## How It Works

Since we're avoiding AI/OCR costs, the user will **manually enter diagram data** through a structured, intuitive form interface. The tool then **renders the diagram visually** and **exports it to Excel**.

---

## Page 1: Data Entry

A clean, professional form where users define their diagram:

- **Process Info** — Name and ID of the business process (e.g., "AL-020")
- **Add Nodes** — For each node, enter:
  - **ID** (e.g., AL-020-010)
  - **Label** (e.g., "Compare Current Available Funds...")
  - **Type**: In-Scope Step (green), Interface/External Process (white), Event (pink), XOR Gateway (circle)
- **Add Connections** — Define arrows between nodes with optional labels (e.g., "Yes", "No")
- **Bulk Import** — Option to paste data from a simple CSV/JSON format for faster entry
- Support for adding multiple nodes and connections quickly with keyboard shortcuts

## Page 2: Diagram Viewer

An interactive, auto-laid-out diagram rendered using **React Flow**:

- Nodes rendered with correct **shapes and colors**:
  - 🟩 Green rounded rectangles = in-scope process steps
  - ⬜ White pentagon/arrow shapes = interface processes (inputs/outputs)
  - 🩷 Pink hexagon = end events
  - 🔵 Blue circle = XOR gateways with labels
- Arrows with labels ("Yes"/"No") connecting nodes
- Auto-layout algorithm to arrange nodes logically (left-to-right flow with branches)
- Pan, zoom, and interactive navigation
- Node IDs displayed above each node (matching the original diagram style)

## Page 3: Excel Export

One-click export generating a professional `.xlsx` file containing:

- **Sheet 1: Nodes** — ID, Label, Type, Description
- **Sheet 2: Connections** — Source Node, Target Node, Label, Direction
- **Sheet 3: Summary** — Process name, total steps, interfaces, gateways count

Export uses the free `xlsx` library (SheetJS) — no server needed.

---

## Design & UX

- Professional, clean interface with a top navigation bar
- Dark sidebar for process list / navigation
- Color-coded badges matching the diagram conventions (green, white, pink, blue)
- Responsive layout
- Ability to save/load diagrams to browser local storage
- Toast notifications for actions (saved, exported, etc.)

