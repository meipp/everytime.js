import dayjs from "dayjs"
import { Dayjs } from "dayjs"

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

function scheduleIterator(action: () => Promise<void>, timesteps: Iterator<Dayjs>) {
    const timestep = timesteps.next()
    if(!timestep.done) {
        const now = dayjs()
        const diff = timestep.value.diff(now)

        setTimeout(async () => {
            await action()
            scheduleIterator(action, timesteps)
        }, diff)
    }
}

export function run(timesteps: Iterable<Dayjs>) {
    return (target: any, memberName: string, propertyDescriptor: PropertyDescriptor) => {
        schedule(timesteps)(propertyDescriptor.value)
    }
}

export function schedule(timesteps: Iterable<Dayjs>) {
    function decorator(action: () => Promise<void>) {
        scheduleIterator(action, timesteps[Symbol.iterator]())
        return action
    }
    return decorator
}

type Milliseconds = number

class TimeIterator implements Iterator<Dayjs> {
    private readonly start: Dayjs
    private readonly step: Milliseconds
    private currentValue: Dayjs | undefined = undefined

    public constructor(start: Dayjs, step: Milliseconds) {
        this.start = start
        this.step = step
    }

    public next(): IteratorResult<Dayjs> {
        if(this.currentValue === undefined) {
            this.currentValue = this.start
        }
        else {
            this.currentValue = this.currentValue.add(this.step)
        }

        return {
            done: false,
            value: this.currentValue
        }
    }
}

abstract class Everytime implements Iterable<Dayjs> {
    public abstract [Symbol.iterator](): Iterator<Dayjs>

    public do(action: () => Promise<void>): void {
        schedule(this)(action)
    }

    public filter(predicate: (timestep: Dayjs) => boolean): Everytime {
        return new FilteredEverytime(this, predicate)
    }

    public map(f: (timestep: Dayjs) => Dayjs): Everytime {
        return new MappedEverytime(this, f)
    }

    public take(n: number): Everytime {
        return new TakeEverytime(this, n)
    }
}

class FilteredEverytime extends Everytime {
    private readonly upstream: Iterable<Dayjs>
    private readonly predicate: (timestep: Dayjs) => boolean

    constructor(upstream: Iterable<Dayjs>, predicate: (timestep: Dayjs) => boolean) {
        super()
        this.upstream = upstream
        this.predicate = predicate
    }

    public *[Symbol.iterator](): Iterator<Dayjs> {
        for(const timestep of this.upstream) {
            if(this.predicate(timestep)) {
                yield timestep
            }
        }
    }
}

class MappedEverytime extends Everytime {
    private readonly upstream: Iterable<Dayjs>
    private readonly f: (timestep: Dayjs) => Dayjs

    constructor(upstream: Iterable<Dayjs>, f: (timestep: Dayjs) => Dayjs) {
        super()
        this.upstream = upstream
        this.f = f
    }

    public *[Symbol.iterator](): Iterator<Dayjs> {
        for(const timestep of this.upstream) {
            yield this.f(timestep)
        }
    }
}

class TakeEverytime extends Everytime {
    private readonly upstream: Iterable<Dayjs>
    private readonly n: number

    constructor(upstream: Iterable<Dayjs>, n: number) {
        super()
        this.upstream = upstream
        this.n = n

        if(n < 0) {
            throw new Error("n can't be negative")
        }
        if(!Number.isInteger(n)) {
            throw new Error("n must be an integer")
        }
    }

    public *[Symbol.iterator](): Iterator<Dayjs> {
        let i = 0
        for(const timestep of this.upstream) {
            if(i++ < this.n) {
                yield timestep
            }
            else {
                break
            }
        }
    }
}

class EverytimeWithStart extends Everytime {
    private readonly start: Dayjs
    private readonly step: Milliseconds

    public constructor(start: Dayjs, step: Milliseconds) {
        super()
        this.start = start
        this.step = step
    }

    public [Symbol.iterator](): Iterator<Dayjs> {
        return new TimeIterator(this.start, this.step)
    }
}

class EverytimeWithoutStart extends Everytime {
    protected readonly step: Milliseconds

    public constructor(step: Milliseconds) {
        super()
        this.step = step
    }

    public [Symbol.iterator](): Iterator<Dayjs> {
        const now = dayjs()
        return new TimeIterator(now, this.step)
    }

    public startingAt(start: Dayjs) {
        return new EverytimeWithStart(start, this.step)
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

        const now = dayjs()
        let start = dayjs().startOf("day").add(hours, "hours").add(minutes, "minutes")

        if(start.diff(now) < 0) {
            start = start.add(1, "day")
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
