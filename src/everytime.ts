import moment from "moment"
import { Moment } from "moment"

const MILLISECONDS = 1
const SECONDS = 1000 * MILLISECONDS
const MINUTES = 60 * SECONDS
const HOURS = 60 * MINUTES
const DAYS = 24 * HOURS
const WEEKS = 7 * DAYS

const MILLISECOND = MILLISECONDS
const SECOND = SECONDS
const MINUTE = MINUTES
const HOUR = HOURS
const DAY = DAYS
const WEEK = WEEKS

const OTHER = 2

function scheduleIterator(action: () => Promise<void>, timesteps: Iterator<Moment>) {
    const timestep = timesteps.next()
    if(!timestep.done) {
        const now = moment()
        const diff = timestep.value.diff(now)

        setTimeout(async () => {
            await action()
            scheduleIterator(action, timesteps)
        }, diff)
    }
}

function schedule(timesteps: Iterable<Moment>) {
    function decorator(action: () => Promise<void>) {
        scheduleIterator(action, timesteps[Symbol.iterator]())
        return action
    }
    return decorator
}

type Milliseconds = number

class TimeIterator implements Iterator<Moment> {
    private readonly start: Moment
    private readonly step: Milliseconds
    private currentValue: Moment | undefined = undefined

    public constructor(start: Moment, step: Milliseconds) {
        this.start = start.clone()
        this.step = step
    }

    public next(): IteratorResult<Moment> {
        if(this.currentValue === undefined) {
            this.currentValue = this.start
        }
        else {
            this.currentValue.add(this.step)
        }

        return {
            done: false,
            value: this.currentValue
        }
    }
}

class EverytimeWithStart implements Iterable<Moment> {
    private readonly start: Moment
    private readonly step: Milliseconds

    public constructor(start: Moment, step: Milliseconds) {
        this.start = start.clone()
        this.step = step
    }

    public [Symbol.iterator](): Iterator<Moment> {
        return new TimeIterator(this.start, this.step)
    }

    public do(action: () => Promise<void>) {
        schedule(this)(action)
    }
}

class EverytimeWithoutStart implements Iterable<Moment> {
    protected readonly step: Milliseconds

    public constructor(step: Milliseconds) {
        this.step = step
    }

    public [Symbol.iterator](): Iterator<Moment> {
        const now = moment()
        return new TimeIterator(now, this.step)
    }

    public startingAt(start: Moment) {
        return new EverytimeWithStart(start, this.step)
    }

    public do(action: () => Promise<void>) {
        schedule(this)(action)
    }
}

class DayWithoutStart extends EverytimeWithoutStart {
    public at(when: string) {
        const match = when.match(/^(\d\d?):(\d\d)$/)
        if(match === null) {
            throw new Error(`Cannot parse time [${when}]`)
        }

        const hours = Number(match[1])
        const minutes = Number(match[2])
        if(hours >= 24 || minutes >= 60) {
            throw new Error(`Cannot parse time [${when}]`)
        }

        const now = moment()
        const start = moment().startOf("day").add(hours, "hours").add(minutes, "minutes")

        if(start.diff(now) < 0) {
            start.add(1, "day")
        }

        return new EverytimeWithStart(start, this.step)
    }
}

class EveryN {
    public readonly milliseconds: EverytimeWithoutStart
    public readonly seconds     : EverytimeWithoutStart
    public readonly minutes     : EverytimeWithoutStart
    public readonly hours       : EverytimeWithoutStart
    public readonly days        : DayWithoutStart
    public readonly weeks       : EverytimeWithoutStart

    public constructor(n: number) {
        this.milliseconds = new EverytimeWithoutStart(n * MILLISECONDS)
        this.seconds      = new EverytimeWithoutStart(n * SECONDS)
        this.minutes      = new EverytimeWithoutStart(n * MINUTES)
        this.hours        = new EverytimeWithoutStart(n * HOURS)
        this.days         = new DayWithoutStart(n * DAYS)
        this.weeks        = new EverytimeWithoutStart(n * WEEKS)
    }
}

class EveryOther {
    public readonly millisecond: EverytimeWithoutStart
    public readonly second     : EverytimeWithoutStart
    public readonly minute     : EverytimeWithoutStart
    public readonly hour       : EverytimeWithoutStart
    public readonly day        : DayWithoutStart
    public readonly week       : EverytimeWithoutStart

    public constructor() {
        this.millisecond = new EverytimeWithoutStart(OTHER * MILLISECOND)
        this.second      = new EverytimeWithoutStart(OTHER * SECOND)
        this.minute      = new EverytimeWithoutStart(OTHER * MINUTE)
        this.hour        = new EverytimeWithoutStart(OTHER * HOUR)
        this.day         = new DayWithoutStart(OTHER * DAY)
        this.week        = new EverytimeWithoutStart(OTHER * WEEK)
    }
}

type Every = ((n: number) => EveryN)
           & {
                millisecond: EverytimeWithoutStart
                second: EverytimeWithoutStart
                minute: EverytimeWithoutStart
                hour: EverytimeWithoutStart
                day: DayWithoutStart
                week: EverytimeWithoutStart

                other: EveryOther
             }

const everyN: (n: number) => EveryN = n => new EveryN(n)

export const every: Every = everyN as Every

every.millisecond = new EverytimeWithoutStart(1 * MILLISECOND)
every.second = new EverytimeWithoutStart(1 * SECOND)
every.minute = new EverytimeWithoutStart(1 * MINUTE)
every.hour = new EverytimeWithoutStart(1 * HOUR)
every.day = new DayWithoutStart(1 * DAY)
every.week = new EverytimeWithoutStart(1 * WEEK)

every.other = new EveryOther()


async function greet() {
    console.log("hello at", moment())
}

// scheduleIterator(greet, every(5).seconds[Symbol.iterator]())
// schedule(every(2).seconds)(A.greet)
every(2).seconds.do(greet)
every.other.day.at("12:15").do(greet)

// every.second.startingAt()

// let i = 0
// for(const x of every(5).days.at("2:15")) {
//     console.log(x)

//     i++
//     if(i === 5) {
//         break;
//     }
// }
