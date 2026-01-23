import { performance } from 'perf_hooks';

// Mock Data - Simulating a large schedule object (approx 100KB)
const largeData = {};
for (let i = 0; i < 365; i++) {
    largeData[`2024-01-${i}`] = {
        prayers: {
            fajr: { start: '05:00', iqamah: '05:30' },
            dhuhr: { start: '12:00', iqamah: '12:30' },
            asr: { start: '15:00', iqamah: '15:30' },
            maghrib: { start: '18:00', iqamah: '18:10' },
            isha: { start: '20:00', iqamah: '20:30' },
        },
        jumuah: { start: '13:00', iqamah: '13:30' }
    };
}

// Mock localStorage
const localStorage = {
    store: {},
    setItem: function(key, value) {
        // Simulate I/O cost (blocking)
        // localStorage is synchronous and can be slow depending on size and disk
        const start = performance.now();
        while (performance.now() - start < 2) {
            // Busy wait to simulate 2ms blocking time
        }
        this.store[key] = value;
    }
};

// Sync Implementation (Baseline)
function syncWrite(key, data) {
    const json = JSON.stringify(data); // Serialization cost
    localStorage.setItem(key, json); // Write cost
}

// Async Implementation (Optimized)
function asyncWrite(key, data) {
    // Simulating requestIdleCallback with setTimeout in Node
    const callback = () => {
        const json = JSON.stringify(data);
        localStorage.setItem(key, json);
    };

    // Schedule it for later
    setTimeout(callback, 0);
}

const ITERATIONS = 100;

console.log(`Running benchmark with ${ITERATIONS} iterations...`);
console.log(`Payload size: ${(JSON.stringify(largeData).length / 1024).toFixed(2)} KB`);

// Measure Sync
const startSync = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    syncWrite('test_key', largeData);
}
const endSync = performance.now();
const totalSyncTime = endSync - startSync;

console.log(`\n--- Baseline (Sync) ---`);
console.log(`Total Blocking Time: ${totalSyncTime.toFixed(2)} ms`);
console.log(`Avg Blocking Time per Op: ${(totalSyncTime / ITERATIONS).toFixed(2)} ms`);


// Measure Async (Time on main thread)
const startAsync = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    asyncWrite('test_key', largeData);
}
const endAsync = performance.now();
const totalAsyncTime = endAsync - startAsync;

console.log(`\n--- Optimized (Async) ---`);
console.log(`Total Main Thread Blocking Time: ${totalAsyncTime.toFixed(2)} ms`);
console.log(`Avg Main Thread Blocking Time per Op: ${(totalAsyncTime / ITERATIONS).toFixed(4)} ms`);

console.log(`\n Improvement: ${((totalSyncTime - totalAsyncTime) / totalSyncTime * 100).toFixed(1)}% less blocking on main thread.`);
