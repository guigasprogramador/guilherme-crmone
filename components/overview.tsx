"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "Jan",
    total: 5,
  },
  {
    name: "Fev",
    total: 8,
  },
  {
    name: "Mar",
    total: 12,
  },
  {
    name: "Abr",
    total: 7,
  },
  {
    name: "Mai",
    total: 10,
  },
  {
    name: "Jun",
    total: 15,
  },
  {
    name: "Jul",
    total: 9,
  },
  {
    name: "Ago",
    total: 11,
  },
  {
    name: "Set",
    total: 14,
  },
  {
    name: "Out",
    total: 16,
  },
  {
    name: "Nov",
    total: 13,
  },
  {
    name: "Dez",
    total: 6,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  )
}

