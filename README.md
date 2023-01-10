# everytimejs - Schedule async functions

## TLDR
```typescript
every.other.day.at("12:00").do(async () => console.log("Hello"))
```

## Full Example
```typescript
import { every } from "everytime.js"

async function greet() {
    console.log("Hello")
}

every(5).days.do(greet)
```

## Install
everytimejs can be installed from [npmjs](https://www.npmjs.com/package/everytime.js) with
```
npm i everytime.js
```

## How to schedule functions

### do()
Normally, you will use the `do`-function to schedule functions.
```typescript
every(5).seconds.do(greet)
```

### schedule
You can wrap the everytime expression into a call to `schedule`.
```typescript
schedule(every.day.at("12:00"))(greet)
```
This allows you to pass custom datetime iterables to `schedule` (see [Schedule custom times](#schedule-custom-times)).

<a id="schedule-custom-times"/>

#### Schedule custom times
`schedule` accepts datetime iterables. The following schedule works:
```typescript
schedule([dayjs(), dayjs().add(1, "day")])
```

### Decorators
TODO
We plan on extending `schedule` to work as a decorator for methods in the future.

## Supported Expressions

### Quantification
Every time unit can be quantified by `every`, `every.other` or `every(n)`:
- `every.second`
- `every.other.second`
- `every(5).seconds`

### Supported time units
The supported time units are
- `millisecond`
- `second`
- `minute`
- `hour`
- `day`
- `week`

### Specific time of the day
`day` can be scheduled for a specific time of the day:
```typescript
every.day.at("12:15")
```
(Note that `hour` is 24-hour based)

## How it works
everytimejs uses `setTimeout` to schedule functions and the [dayjs](https://github.com/iamkun/dayjs/) library to calculate time differences.

Normally, the process will run forever (because expressions like `every.day` describe infinitely many datetimes). If you use a finite custom iterable with `schedule`, the process will terminate accordingly.
