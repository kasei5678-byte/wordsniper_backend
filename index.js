const express = require("express");
const app = express();
const port = 3000;
app.use(express.json());


app.listen(port, () => console.log("server get up"))

app.get("/", (req, res) => {
    res.send("start Programing");
});

//customer info
const customers = [
    {title:"Tanaka", id: 1},
    {title:"Saito", id: 2},
    {title:"Hashimoto", id: 3}    
];

//get data(GET method)
app.get("/api/customers", (req, res) => {
    res.send(customers);
});

app.get("/api/customers/:id", (req, res)=>{
    const customer = customers.find((c) => c.id===parseInt(req.params.id))
    res.send(customer);
})

//send data and make
app.post("/api/customers", (req, res)=>{
    const customer = {
        title: req.body.title,
        id:customer.length+1
    };
    customers.push(customer);
    res.send(customers);
});

//data renew
app.put("/api/customer/:id", (req, res) => {
    const customer = customers.find((c) => c.id===parseInt(req.params.id))
    customer.title = req.body.title;
    res.send(customer);
});

app.delete("/api/customer/:id", (req, res) =>{
    const customer = customers.find((c) => c.id===parseInt(req.params.id))
    
    const index = customer.indexOf(customer);
    customer.splice(index, 1)

    res.send(customer);
});