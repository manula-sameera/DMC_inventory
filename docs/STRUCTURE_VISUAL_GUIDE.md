# Database Structure - Visual Guide

## Old Structure (Item-by-Item)

```
┌─────────────────────────────────────────────────┐
│           INCOMING_STOCK (Old)                  │
├─────────────────────────────────────────────────┤
│ GRN_ID │ Date  │ Item_ID │ Supplier │ Qty │... │
├─────────────────────────────────────────────────┤
│   1    │ 12/01 │    5    │  ABC     │ 100 │    │  ← Same supplier
│   2    │ 12/01 │    8    │  ABC     │  50 │    │  ← Same date
│   3    │ 12/01 │   12    │  ABC     │ 200 │    │  ← Repeated entry!
│   4    │ 12/02 │    5    │  XYZ     │  75 │    │
└─────────────────────────────────────────────────┘

Problem: Supplier name repeated for each item!
```

... (file content preserved) ...
