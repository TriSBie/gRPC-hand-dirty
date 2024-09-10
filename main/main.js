const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require('@grpc/proto-loader');

const express = require('express');

const packageDefinitionRec = protoLoader.loadSync(path.join(__dirname, "../protos", "degree.proto"), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const packageDefinitionProc = protoLoader.loadSync(path.join(__dirname, "../protos", "processing.proto"), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const degreeProto = grpc.loadPackageDefinition(packageDefinitionRec);
const processingProto = grpc.loadPackageDefinition(packageDefinitionProc);

const degreeStub = new degreeProto.Degrees('0.0.0.0:50051',
    grpc.credentials.createInsecure());
const processingStub = new processingProto.Processing('0.0.0.0:50052',
    grpc.credentials.createInsecure());

const app = express();
app.use(express.json());

const port = 3000;
let orders = {};

function processAsync(order) {
    degreeStub.find({
        id: order.degreeId
    }, (err, degree) => {
        if (err) {
            console.error(err.message);
            console.error(err.code);
            return;
        }
        // assign to object orders by order id and degree value
        orders[order.id].degree = degree;

        const call = processingStub.process({
            orderId: order.id,
            degreeId: order.degreeId
        })

        call.on('data', (statusUpdate) => {
            let statusValue;
            switch (statusUpdate.status) {
                case 0:
                    statusValue = "NEW"
                    break;
                case 1:
                    statusValue = "QUEUED"
                    break;
                case 2:
                    statusValue = "PROCESSING"
                    break;
                case 3:
                    statusValue = "DONE"
                    break;
                default:
                    statusValue = "DEFAULT"
                    break;
            }
            orders[order.id].status = statusValue;
        });
    });
}

app.post('/studentOnboard', (req, res) => {
    // Time start of the request
    console.time('studentOnboard');
    if (!req.body.degreeId) {
        res.status(400).send('Product identifier is not set');
        return;
    }
    let orderId = Object.keys(orders).length + 1;
    let order = {
        id: orderId,
        status: "NEW",
        degreeId: req.body.degreeId,
        personalDetails: {
            name: req.body.name,
            DOB: req.body.DOB,
            education: req.body.education,
            fatherName: req.body.father
        },
        createdAt: new Date().toLocaleString()
    };
    orders[order.id] = order;
    processAsync(order);
    res.send(order);
    console.timeEnd('studentOnboard');
});

console.log("1", new Date());
console.log("2", new Date().toISOString()); // same as 1
console.log("3", new Date().toUTCString());
console.log("4", new Date().toLocaleString());
console.log("5", new Date().toLocaleDateString());
console.log("6", new Date().toLocaleTimeString());
console.log("7", new Date().toDateString());
console.log("8", new Date().toTimeString());
console.log("9", new Date().toJSON());
console.log("10", new Date().valueOf());
console.log("11", new Date().getTime());


app.get('/onboardingStatus/:id', (req, res) => {
    if (!req.params.id || !orders[req.params.id]) {
        res.status(400).send('OnBoarding form  not found');
        return;
    }
    res.send(orders[req.params.id]);
});

app.listen(port, () => {
    console.log(`API is listening on port ${port}`)
});