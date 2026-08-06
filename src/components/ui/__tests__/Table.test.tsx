import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table"

function renderTable(children: React.ReactNode) {
  return render(<Table>{children}</Table>)
}

describe("Table", () => {
  it("renders a <table> element wrapped in a scrollable container", () => {
    const { container } = renderTable(null)
    expect(container.querySelector(".overflow-x-auto")).not.toBeNull()
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("table has min-w-full class to allow horizontal scroll", () => {
    const { container } = renderTable(null)
    expect(container.querySelector("table")?.className).toContain("min-w-full")
  })
})

describe("THead", () => {
  it("renders a <thead> element", () => {
    const { container } = renderTable(
      <THead>
        <Tr>
          <Th>Col</Th>
        </Tr>
      </THead>,
    )
    expect(container.querySelector("thead")).not.toBeNull()
  })
})

describe("TBody", () => {
  it("renders a <tbody> element with divide-y class", () => {
    const { container } = renderTable(
      <TBody>
        <Tr>
          <Td>cell</Td>
        </Tr>
      </TBody>,
    )
    const tbody = container.querySelector("tbody")
    expect(tbody).not.toBeNull()
    expect(tbody?.className).toContain("divide-y")
  })
})

describe("Tr", () => {
  it("renders a <tr> element with hover transition", () => {
    const { container } = renderTable(
      <TBody>
        <Tr>
          <Td>x</Td>
        </Tr>
      </TBody>,
    )
    const tr = container.querySelector("tr")
    expect(tr?.className).toContain("hover:bg-cream")
  })
})

describe("Th", () => {
  it("renders a <th> with scope=col (WCAG requirement)", () => {
    const { container } = renderTable(
      <THead>
        <Tr>
          <Th>Col</Th>
        </Tr>
      </THead>,
    )
    const th = container.querySelector("th")
    expect(th?.getAttribute("scope")).toBe("col")
  })

  it("renders the cell content", () => {
    renderTable(
      <THead>
        <Tr>
          <Th>Name</Th>
        </Tr>
      </THead>,
    )
    expect(screen.getByText("Name")).toBeInTheDocument()
  })
})

describe("Td", () => {
  it("renders a <td> element with padding", () => {
    const { container } = renderTable(
      <TBody>
        <Tr>
          <Td>cell</Td>
        </Tr>
      </TBody>,
    )
    const td = container.querySelector("td")
    expect(td).not.toBeNull()
    expect(td?.className).toContain("px-4")
  })

  it("renders the cell content", () => {
    renderTable(
      <TBody>
        <Tr>
          <Td>Value</Td>
        </Tr>
      </TBody>,
    )
    expect(screen.getByText("Value")).toBeInTheDocument()
  })
})

describe("Table composition", () => {
  it("supports a full table with thead, tbody, rows and cells", () => {
    const { container } = renderTable(
      <>
        <THead>
          <Tr>
            <Th>Name</Th>
            <Th>Price</Th>
          </Tr>
        </THead>
        <TBody>
          <Tr>
            <Td>Cookie</Td>
            <Td>R$ 15</Td>
          </Tr>
          <Tr>
            <Td>Brownie</Td>
            <Td>R$ 20</Td>
          </Tr>
        </TBody>
      </>,
    )
    expect(container.querySelectorAll("th").length).toBe(2)
    expect(container.querySelectorAll("tbody tr").length).toBe(2)
    expect(screen.getByText("Cookie")).toBeInTheDocument()
    expect(screen.getByText("Brownie")).toBeInTheDocument()
  })
})
