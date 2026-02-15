const checkOverlap = (checkStart, checkEnd, events) => {
    const conflict = events.find((e) => {
        const eStart = new Date(e.start.dateTime || e.start.date).getTime();
        const eEnd = new Date(e.end.dateTime || e.end.date).getTime();
        // Debug
        // console.log(`Checking ${checkStart.toISOString()} - ${checkEnd.toISOString()} against ${new Date(eStart).toISOString()} - ${new Date(eEnd).toISOString()}`);
        return (checkStart.getTime() < eEnd && checkEnd.getTime() > eStart);
    });
    return conflict;
};
const testCases = [
    {
        name: "Exact Match",
        slot: { start: "2023-01-01T10:00:00Z", end: "2023-01-01T11:00:00Z" },
        event: { start: { dateTime: "2023-01-01T10:00:00Z" }, end: { dateTime: "2023-01-01T11:00:00Z" } },
        shouldOverlap: true
    },
    {
        name: "Inside Event",
        slot: { start: "2023-01-01T10:15:00Z", end: "2023-01-01T10:45:00Z" },
        event: { start: { dateTime: "2023-01-01T10:00:00Z" }, end: { dateTime: "2023-01-01T11:00:00Z" } },
        shouldOverlap: true
    },
    {
        name: "Enclosing Event",
        slot: { start: "2023-01-01T09:00:00Z", end: "2023-01-01T12:00:00Z" },
        event: { start: { dateTime: "2023-01-01T10:00:00Z" }, end: { dateTime: "2023-01-01T11:00:00Z" } },
        shouldOverlap: true
    },
    {
        name: "Partial Overlap Start",
        slot: { start: "2023-01-01T09:30:00Z", end: "2023-01-01T10:30:00Z" },
        event: { start: { dateTime: "2023-01-01T10:00:00Z" }, end: { dateTime: "2023-01-01T11:00:00Z" } },
        shouldOverlap: true
    },
    {
        name: "Partial Overlap End",
        slot: { start: "2023-01-01T10:30:00Z", end: "2023-01-01T11:30:00Z" },
        event: { start: { dateTime: "2023-01-01T10:00:00Z" }, end: { dateTime: "2023-01-01T11:00:00Z" } },
        shouldOverlap: true
    },
    {
        name: "Touch Start (No Overlap)",
        slot: { start: "2023-01-01T09:00:00Z", end: "2023-01-01T10:00:00Z" },
        event: { start: { dateTime: "2023-01-01T10:00:00Z" }, end: { dateTime: "2023-01-01T11:00:00Z" } },
        shouldOverlap: false
    },
    {
        name: "Touch End (No Overlap)",
        slot: { start: "2023-01-01T11:00:00Z", end: "2023-01-01T12:00:00Z" },
        event: { start: { dateTime: "2023-01-01T10:00:00Z" }, end: { dateTime: "2023-01-01T11:00:00Z" } },
        shouldOverlap: false
    }
];
let failed = 0;
testCases.forEach(tc => {
    const result = checkOverlap(new Date(tc.slot.start), new Date(tc.slot.end), [tc.event]);
    const isOverlap = !!result;
    if (isOverlap !== tc.shouldOverlap) {
        console.error(`FAILED: ${tc.name}. Expected ${tc.shouldOverlap}, got ${isOverlap}`);
        failed++;
    }
    else {
        console.log(`PASSED: ${tc.name}`);
    }
});
if (failed === 0) {
    console.log("All overlap tests passed.");
}
else {
    process.exit(1);
}
export {};
