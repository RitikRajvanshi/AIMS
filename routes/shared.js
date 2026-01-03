var express = require('express');
var router = express.Router();
var db = require('../dbconfig');
const jwt = require('jsonwebtoken');
const { error, message } = require('emailjs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const secretKey = "5d8424d84c1b3e816490ed0b072dc7113c48d73e37633bfb41f6b7abdaaa8c9515d5b0c2ab89901f8eaf61cc638b02f495d1719c82076f00d70277bbb63c09cc";

// Proxy URL (your corporate proxy)
const proxyUrl = 'http://192.168.0.220:3128';
// Create agent
const agent = new HttpsProxyAgent(proxyUrl);

function ensureToken(req, res, next) {

  const bearerHeader = req.headers["authorization"];


  if (typeof bearerHeader !== 'undefined') {
    console.log('bearerHeader', bearerHeader);

    const bearer = bearerHeader.split(" ");

    console.log('bearer', bearer);

    const bearerToken = bearer[1];
    req.token = bearerToken;


    jwt.verify(req.token, secretKey, (err, authData) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          // Token has expired
          // Access the expiration time using err.expiredAt
          const expirationTime = err.expiredAt;
          res.status(403).json({ message: 'Token expired', expirationTime });
        } else {

          res.sendStatus(403);
        }

      }
      else {
        next();
      }
    });

  } else {
    res.sendStatus(403);
  }
}

//Admin's users

//users join tables data
router.post('/getUsersdatabyid', (req, res) => {

  let userid = req.body.user_id;
  db.query(`SELECT * from get_usersjoindata_byid($1)`, [userid], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getUsersdatabystatus', (req, res) => {

  db.query(`SELECT * from get_users_databystatus() order by user_id desc`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getDesigntype', (req, res) => {
  db.query(`SELECT get_designation_name()`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows)
  });
});

//full data
router.get('/getDesigndetail', (req, res) => {
  db.query(`SELECT * FROM designation where designation.designation_status='1'`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows)
    // console.log(results.rows);
  });
});

//delete operations
router.post('/deleteDesigndetail', (req, res) => {
  let designation_id = req.body.designation_id;
  // console.log('id', id);
  db.query(`SELECT delete_designation_detail($1)`, [designation_id], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json({ message: 'Delete designation successfully....' })
  });
});

router.post('/deletePrivilegedetail', (req, res) => {
  let designation_id = req.body.designation_id;
  // console.log('id', id);
  db.query(`SELECT delete_privilege_detail($1)`, [designation_id], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json({ message: 'Delete privilege successfully....' })
  });
});

router.post('/deletegrpdetail', (req, res) => {
  let grp_id = req.body.grp_id;
  // console.log('id', id);
  db.query(`SELECT delete_group_detail($1)`, [grp_id], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json({ message: 'Delete group successfully....' })
  });
});

router.post('/deleteproductdetail', (req, res) => {
  let product_id = req.body.product_id;
  // console.log('id', id);
  db.query(`SELECT delete_product_detail($1)`, [product_id], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json({ message: 'Delete product successfully....' })
  });
});

router.post('/deletecategorydetail', (req, res) => {
  let category_id = req.body.category_id;
  // console.log('id', id);
  db.query(`SELECT delete_category_detail($1)`, [category_id], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json({ message: 'Delete category successfully....' })
  });
});

router.post('/deletelocationdetail', (req, res) => {
  let id = req.body.location_id;
  // console.log('id', id);
  db.query(`SELECT delete_location_detail(${id})`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json({ message: 'Delete location successfully....' })
  });
});

router.get('/getUsertype', (req, res) => {

  db.query(`SELECT get_privilege_name()`, (err, results) => {
    if (err) {
      throw err
    }
    // localStorage.setItem('PrivilegeId',)
    res.status(200).json(results.rows);
  });
});

//from users table
router.get('/getUsersdata', (req, res) => {

  db.query(`SELECT * from users`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getUsersJoindata', (req, res) => {

  db.query(`SELECT * from get_usersjoindata()`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});

router.post('/getUsersJoindatabyid', (req, res) => {

  let user_id = req.body.user_id;

  db.query(`SELECT * from get_usersjoindatabyid($1)`, [user_id], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});


router.get('/getPrivilegedetail', (req, res) => {

  db.query(`SELECT * from privilege where privilege.privilege_status='1' `, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});

router.post('/getPrivilegenamebyId', (req, res) => {
  let privilege_id = req.body.privilege_id

  db.query(`SELECT * from get_privilegename_byid($1)`, [privilege_id], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});

router.post('/getProductnamebyId', (req, res) => {
  let product_id = req.body.product_id;
  console.log(req.body, "product_id");

  db.query(`SELECT product_name from products where product_id=$1`, [product_id], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows[0]);
  });
});

router.get('/getProductDatajoinbystatus', (req, res) => {

  db.query(`SELECT * FROM  get_product_joindatabystatus() order by product_id desc`, (err, results) => {
    if (err) {
      throw err
    }
    // console.log(results.rows);
    res.status(200).json(results.rows);
  });
});


router.post('/getProductIdbyName', (req, res) => {
  let name = req.body.product_name;

  db.query(`SELECT * from get_product_id_byname($1)`, [name], (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});


router.get('/getSuppliername', (req, res) => {

  db.query(`SELECT * from get_supplier_name() `, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});


router.get('/getSupplierdata', (req, res) => {

  // db.query(`SELECT * from supplier WHERE supplier.status in ('1','2') order by supplier_id desc; `, (err, results) => {
  db.query(`SELECT * from supplier order by supplier_id desc; `, (err, results) => {
    if (err) {
      throw err
    }

    res.status(200).json(results.rows);
  });
});



router.post('/getSupplieridbyName', (req, res) => {
  let supplier_name = req.body.supplier_name

  db.query(`SELECT * from get_supplier_id_byname($1)`, [supplier_name], (err, results) => {
    if (err) {
      throw err
    }

    res.status(200).json(results.rows);
  });
});

router.post('/getSupplierdatabyid', (req, res) => {
  let supplierid = req.body.supplier_id;
  db.query(`SELECT * FROM get_supplier_data_byid($1)`, [supplierid], (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});


router.post('/getSupplierdatabyname', (req, res) => {
  let suppliername = req.body.supplier_name;
  db.query(`SELECT * FROM get_supplier_data_byname($1)`, [suppliername], (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getGrouptype', (req, res) => {
  db.query(`SELECT get_group_name()`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });

});

router.get('/getGroupdetail', (req, res) => {
  db.query(`SELECT * FROM  "group" where group.group_status='1'`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows)
  })

})

router.post('/getgroupnamebyid', (req, res) => {
  let id = req.body.grp_id;

  db.query(`SELECT * from get_groupname_byid(${id})`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows)
  });
});



//Designationtable services
// ---->  2 times used with different name please correct it and change it in procedure   <----


router.post('/privilegeIdfromname', (req, res) => {
  let privilegeName = req.body.privilege_name;

  db.query(`SELECT * from get_privilegeid_byname($1)`, [privilegeName], (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  });
});

router.post('/getGrpIdbyName', (req, res) => {

  let GrpName = req.body.grp_name;
  // console.log(GrpName)
  db.query(`SELECT * FROM get_groupid_byname($1)`[GrpName], (err, respond) => {
    if (err) {
      throw err
    }
    res.status(200).json(respond.rows);
  });
});


router.post('/getDesinIdfromname', (req, res) => {
  let designationName = req.body.designation_name;

  db.query(`SELECT * FROM get_designationid_byname($1)`, [designationName], (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.post('/getDesinnamebyId', (req, res) => {
  let designationid = req.body.designation_id;

  db.query(`SELECT * FROM get_designationname_byid($1)`, [designationid], (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.post('/getProductdatabyId', (req, res) => {
  let product_id = req.body.product_id;

  db.query(`SELECT * FROM get_productdata_byid($1)`, [product_id], (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.post('/getCategorydatabyId', (req, res) => {
  let categoryid = req.body.category_id;

  db.query(`SELECT * FROM get_categorydata_byid($1)`, [categoryid], (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.post('/getlocationdatabyId', (req, res) => {
  let locationid = req.body.location_id;

  db.query(`SELECT * FROM get_locationdata_byid($1)`, [locationid], (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})


router.get('/getproductdetail', (req, res) => {
  db.query(`SELECT * FROM  products where products.product_status = '1' ;`, (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.get('/getcategorydetail', (req, res) => {

  db.query(`SELECT * from category where category.category_status='1'`, (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.get('/getlocationdetail', (req, res) => {

  db.query(`SELECT * from location where location.status='1'`, (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.post('/getcategoryidbyname', (req, res) => {
  let name = req.body.category_name

  // db.query(`SELECT * FROM get_categoryid_byname('${name}')`, (err, respond) => {
  db.query(`SELECT * FROM get_categoryid_byname($1)`, [name], (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

//request table
router.get('/getAcceptedrequest', (req, res) => {
  db.query(`SELECT * FROM get_acceptedrequest() order by request_id desc`, (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.get('/getPendingrequest', (req, res) => {

  db.query(`SELECT * FROM get_pendingrequest() order by request_id desc`, (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.post('/getPendingrequestbyId', (req, res) => {
  let request_id = req.body.request_id;
  // console.log(req.body);
  db.query(`SELECT * FROM get_pendingrequestbyId($1)`, [request_id], (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})

router.get('/getRejectedrequest', (req, res) => {

  db.query(`SELECT * FROM get_rejectedrequest() order by request_id desc`, (err, respond) => {
    if (err) {
      throw err
    }

    res.status(200).json(respond.rows);
  })
})


router.get('/getLastPurchaseId', (req, res) => {

  db.query(`Select purchase_id from  purchase_order order by purchase_id  desc limit 1`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getLastdirectPurchaseId', (req, res) => {

  db.query(`Select purchase_id from  purchase_order where purchase_id ilike 'DP-%' order by purchase_id  desc limit 1;`, (err, results) => {
    if (err) {
      throw err
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getpurchasejoindata', (req, res) => {
  db.query(`SELECT * FROM get_purchasejoindata()`, (err, result) => {
    if (err) {
      throw err;
    }

    res.status(200).json(result.rows);
  });
});

router.get('/getpurchaseorderData', (req, res) => {

  db.query(`SELECT * FROM get_purchaseorderdata()`, (err, result) => {

    if (err) {
      throw err;
    }

    // console.log(result.rows, "get_purchaseorderdata");
    res.status(200).json(result.rows);
  });
});

//convert join to left outer join
router.get('/getpurchaseorderDataacctoinvoiceupload', (req, res) => {
  const query = `SELECT po.purchase_id , po.is_sent , po.sent_by , po.sent_date , po.created_by , po.created_date, po.supplier_id , po.po_approval_date, su.supplier_name
  ,po.invoice_no, po.modified_date, po.filename, po.filepath,  array_agg(pi.inspected_by) as inspected_by
  FROM  purchase_order as po 
   left outer join supplier as su on su.supplier_id = po.supplier_id
   left outer join purchase_item as pi on pi.purchase_id = po.purchase_id where po.filename is not null group by po.purchase_id , po.is_sent , po.sent_by , po.sent_date , po.created_by , po.created_date, po.supplier_id , po.po_approval_date, su.supplier_name
  ,po.invoice_no, po.modified_date, po.filename 
   ORDER BY purchase_id DESC ;`

  db.query(query, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


router.post('/getpurchasejoindatabyId', (req, res) => {
  let id = req.body.id;

  db.query(`SELECT * FROM get_purchasejoindatabyid(${id})`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getpurchasejoindatabyIdorpurchaseid', (req, res) => {
  let purchase_id = req.body.purchase_id;

  db.query(`SELECT * FROM get_purchasejoindataby_pid($1)`, [purchase_id], (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getpurchasedatafrompo', (req, res) => {

  db.query(`SELECT * FROM get_purchasedata_from_purchaseorder() where is_sent=0 order by purchase_id  desc`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getpurchasedatafrompoforinvoice', (req, res) => {

  db.query(`SELECT iv.*, sup.supplier_name FROM get_purchasedata_from_purchaseorder() iv left join supplier sup on sup.supplier_id = iv.supplier_id order by purchase_id desc;`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


router.get('/getpurchasedatafrompoacctoinvoice', (req, res) => {

  db.query(`SELECT iv.*, sup.supplier_name FROM get_purchasedata_from_po_acctoinvoice() iv join supplier sup on sup.supplier_id = iv.supplier_id order by purchase_id desc`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getpurchasedatabyid', (req, res) => {

  let id = req.body.purchase_id;
  db.query(`SELECT * FROM get_purchasedata_byid($1)`, [id], (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getpurchaseorderdatabypid', (req, res) => {

  //join wih supplier table get supplier name also.
  let purchase_id = req.body.purchase_id;
  console.log(purchase_id);
  db.query(`SELECT * FROM get_purchaseorderdata_byp_id($1)`, [purchase_id], (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  }
  );
});

router.get('/getInvoicedata', (req, res) => {
  db.query(`SELECT * FROM invoice;`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });

});

router.post('/getInvoicedatabyid', (req, res) => {
  let invoice_id = req.body.invoice_id;
  db.query(`SELECT * FROM get_invoicedata_byid($1)`, [invoice_id], (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getpurchasejoindatabypid', (req, res) => {
  //received date, inspection date, other column from invoice table(depreceated/dropped) table into purchase order
  console.log(req.body, "req");
  let purchase_id = req.body.purchase_id;

  db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id], (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getinspectioninfofromarrayofpid', async (req, res) => {
  //received date, inspection date, other column from invoice table(depreceated/dropped) table into purchase order
  const purchase_id = req.body;
  // console.log(purchase_id)
  try {
    // You have to give it like [[]] to know postgres that the data come is in array.
    const result = await db.query(`SELECT * FROM getpidatafromarrayofpid($1)`, [[purchase_id]]);
    res.json(result.rows);
  }
  catch (error) {
    res.status(500).json({ error: 'Internal Server Error' })
  }
});



router.post('/getpurchasejoindataby_id', (req, res) => {
  //received date, inspection date, other column from invoice table(depreceated/dropped) table into purchase order
  let id = req.body.id;

  db.query(`SELECT * FROM get_purchasejoindataby_id($1)`, [id], (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

//Items
//only apporpriate locatiion item data shown

router.get('/getItemsData', (req, res) => {

  // when any purchase id = NA then it will below the list other wise order by purchase id desc
  db.query(`SELECT * FROM get_items_data() where (location_id = 1 or location_id =2 or location_id=3) and item_status='1'
  order by case 
  when purchase_id = 'NA' then 1 else 0 end, 
  purchase_id desc,
  item_code asc;`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getItemsDatawithuserandlocation', (req, res) => {

  // when any purchase id = NA then it will below the list other wise order by purchase id desc
  db.query(`SELECT * FROM get_items_data_by_location_and_user6() order by case 
  when purchase_id = 'NA' then 1 else 0 end, purchase_id like 'BRND%' ,  purchase_id desc`, (err, result) => {
    if (err) {
      throw err;
    }


    res.status(200).json(result.rows);
  });
});

// router.get('/getItemsDatalocation', (req, res) => {

//   db.query(`SELECT * FROM get_items_data() order by date_ desc `, (err, result) => {

//     if (err) {
//       throw err;
//     }
//     res.status(200).json(result.rows);
//   })

// });

router.get('/getSystemdatafromitems', (req, res) => {
  //location id =1(warehouse) || 2(3/311)
  db.query(`Select * from get_items_data() where (item_name ='CPU' or item_name='LAPTOP' or item_name='ALL IN ONE PC') and (location_id = 2 or location_id = 1 or location_id=3) order by item_id desc;`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

// for RAMS
router.get('/getRamdatafromitems', (req, res) => {
  //location id =1(warehouse) || 2(3/311)
  // db.query(`Select * from get_items_data() where (item_name ='RAM' or item_name ='B-RAM') and (location_id = 2 or location_id = 1) and item_status='1' ORDER BY
  // CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END;`, (err, result) => {

  // addon branded ram only if only in warehouse
  db.query(`Select * from get_items_data() where (item_name ='RAM' and location_id in (1,2)) or (item_name ='B-RAM' and (location_id = 1  or item_status='1')) ORDER BY
  CASE WHEN purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END, item_id desc`, (err, result) => {

    if (err) {
      throw err;
    }

    res.status(200).json(result.rows);
  });
});

router.get('/getsmpsdatafromitems', (req, res) => {

  //location id =1(warehouse) || 2(3/311)
  // db.query(`Select * from get_items_data() where (item_name ='SMPS' or item_name ='smps' or item_name ='B-SMPS') and (location_id = 2 or location_id = 1)  and item_status='1'
  // ORDER BY CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END;`, (err, result) => {

  db.query(`Select * from get_items_data() where ((item_name ='SMPS' or item_name ='smps') and location_id in (1,2)) or (item_name ='B-SMPS' and (location_id = 1  or item_status='1'))
      ORDER BY CASE WHEN  purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END, item_id desc;`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


router.get('/gethdddatafromitems', (req, res) => {

  //location id =1(warehouse) || 2(3/311)
  // db.query(`Select * from get_items_data() where (item_name ='HDD' or item_name ='hdd' or item_name = 'B-HDD' or item_name='SSD HDD') and (location_id = 2 or location_id = 1) and item_status='1'
  // ORDER BY CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END;`, (err, result) => {

  db.query(`Select * from get_items_data() where ((item_name ='HDD' or item_name ='hdd'  or item_name='SSD HDD') and location_id in(1,2)) or (item_name = 'B-HDD' and (location_id = 1 or item_status='1'))
      ORDER BY CASE WHEN  purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END;`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getgraphiccardDatafromitems', (req, res) => {

  //location id =1(warehouse) || 2(3/311)
  // db.query(`Select * from get_items_data() where (item_name ='Graphics Card' or item_name ='Graphic Card' or item_name ='B-GRAPHICS CARD') 
  //   and (location_id = 2 or location_id = 1) and item_status='1'
  // ORDER BY CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END;`, (err, result) => {

  db.query(`SELECT * FROM get_items_data() 
WHERE 
  ((item_name = 'Graphics Card' OR item_name = 'Graphic Card') AND location_id IN (1, 2)) 
  OR ((item_name = 'B-GRAPHICS CARD' or item_name = 'B-Graphics Card') AND (location_id = 1 OR item_status = '1'))  
ORDER BY 
  CASE 
    WHEN purchase_id ILIKE 'BRND%' THEN 1 
    ELSE 0 
  END;`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


// router.get('/getItemsotherthanCPU', (req, res) => {

//   db.query(`Select * from get_items_data() where (item_name !='CPU' AND item_name !='LAPTOP' AND item_name !='ALL IN ONE PC')and (location_id = 2 or location_id = 1 or location_id=3)  ORDER BY
//   CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END , item_id desc;`, (err, result) => {

//     if (err) {
//       throw err;
//     }
//     res.status(200).json(result.rows);
//   })

// })

router.get('/getItemsotherthanCPU', (req, res) => {

  // db.query(`Select * from get_items_data() as itd
  // left join products pr on pr.product_name = itd.item_name
  // left join category cat on cat.category_id = pr.category_id
  // where cat.category_name='Computer Hardware'and (item_name !='CPU' AND item_name !='LAPTOP' AND item_name !='ALL IN ONE PC')
  // ORDER BY CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END , item_id desc;

  db.query(`Select * from get_items_data() as itd
  where itd.category_name='Computer Hardware' and (item_name !='CPU' AND item_name !='LAPTOP' AND item_name !='ALL IN ONE PC')
  ORDER BY CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%'  THEN 1 ELSE 0 END , item_id desc`
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});

router.get('/getItemsotherthanCPUwithalllocation', (req, res) => {

  // db.query(`Select * from get_items_data() where item_status <> '2' ORDER BY CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END , item_id desc;`, (err, result) => {
  db.query(`Select * from get_items_data() ORDER BY CASE WHEN item_code LIKE '-%' OR purchase_id ILIKE 'BRND%' THEN 1 ELSE 0 END , item_id desc;`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getlastItemCode', (req, res) => {
  let item_name = req.body.item_name;

  db.query(`SELECT COUNT(item_name) from items where item_name=$1`, [item_name], (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(`${item_name}-${result.rows[0].count}`);
  });
});

router.get('/getDocumentdata', (req, res) => {

  db.query(`SELECT * FROM get_document_data() order by document_id desc`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getDocumentdatabydocId', (req, res) => {

  let document_id = req.body.document_id;
  db.query(`SELECT * FROM get_document_data_by_docid(${document_id})`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getQuotationdata', (req, res) => {
  db.query(`SELECT * FROM get_quotation_data() order by quotation_id desc`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getQuotationdatabyId', (req, res) => {

  let quotation_id = req.body.quotation_id;
  db.query(`SELECT * FROM get_quotation_data_byid(${quotation_id})`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  })
})


//checkitout
router.post('/verificationofpIdinsupplierEvaluation', (req, res) => {

  let purchase_id = req.body.purchase_id;
  db.query(`SELECT * FROM verification_of_supplierevaluation('${purchase_id}')`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });

});

router.post('/getSupplierjoindatafrompo', (req, res) => {

  let purchase_id = req.body.purchase_id;

  db.query(`SELECT * FROM get_supplierjoindata_from_po('${purchase_id}')`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.post('/getsupplierEvaluationdatabyPid', (req, res) => {
  let purchase_id = req.body.purchase_id;
  db.query(`SELECT * FROM get_supplierevaluationdata_bypid('${purchase_id}')`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


//this api is also in admin route
router.post('/getsupplierEvaluationdatabysupplierId', (req, res) => {
  let supplier_id = req.body.supplier_id;

  db.query(`SELECT * FROM get_supplierevaluationdata_bysupplierId(${supplier_id})`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getvendorEvaluationjoindata', (req, res) => {

  db.query(`SELECT * FROM get_vendorevaluationjoindata()`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


router.post('/getSupplierdatabybydatefilter', (req, res) => {
  let start_date = req.body.start_date;
  let end_date = req.body.end_date;
  db.query(`SELECT * FROM get_supplier_data_by_datefilter('${start_date}','${end_date}') order by supplier_id desc`, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.post('/getpurchasejoinDatabydate', (req, res) => {
  let start_date = req.body.start_date;
  let end_date = req.body.end_date;
  db.query(`SELECT * FROM get_purchasejoindatabydate('${start_date}','${end_date}')`, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.post('/getpurchaseorderDatabydate', (req, res) => {
  let start_date = req.body.start_date;
  let end_date = req.body.end_date;
  db.query(`SELECT * FROM get_purchaseorderdata_bycreated_date('${start_date}','${end_date}')`, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.post('/getreportpurchaseorderDatabydate', (req, res) => {
  let start_date = req.body.start_date;
  let end_date = req.body.end_date;

  db.query(`SELECT * FROM get_reportpurchaseorderdata_bycreated_date('${start_date}','${end_date}')`, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getreportpurchaseorderData', (req, res) => {

  db.query(`SELECT * FROM get_reportpurchaseorderdata()`, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.post('/getpurchaseorderDatabydateforasset', (req, res) => {
  let start_date = req.body.start_date;
  let end_date = req.body.end_date;
  db.query(`SELECT * FROM get_purchaseorderdataforasset_bycreated_date('${start_date}','${end_date}')`, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getsendpurchaseorderData', (req, res) => {

  db.query(`SELECT * FROM get_sendpurchaseorderdata()`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getcountofreceivedpurchaseorder', (req, res) => {

  db.query(`SELECT count(purchase_id)FROM purchase_order where purchase_order.is_sent=1 `, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });

});

router.get('/getcountofreceivedrequest', (req, res) => {
  db.query(`select count(request_item) from request where request.request_status = '0'and request.is_active= '1'`, (err, result) => {
    if (err) {
      throw err;
    }
    // console.log(result.rows);
    res.status(200).json(result.rows);

  });
});

router.post('/getcountofPurchaseOrders', (req, res) => {

  //between the dates
  const start_date = req.body.start_date;
  const end_date = req.body.end_date;

  // db.query(`select count(request_item) from request where request.request_status = '0'and request.is_active= '1' and request.created_date between '${start_date}' and '${end_date}'`, (err, result) => {
  // db.query(`select count(po.purchase_id) from purchase_order as po join purchase_item as pi on pi.purchase_id = po.purchase_id
  // where po.filename is not null and po.is_sent=2  and po.created_date  between'${start_date}' and '${end_date}'`, (err, result) => {
  db.query(`select  count(distinct po.purchase_id) from purchase_order as po join purchase_item as pi on pi.purchase_id = po.purchase_id
    where po.filename is not null and po.is_sent=2  and po.created_date  between'${start_date}' and '${end_date}'`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


router.get('/getsumTotalfrompurchaseItem', (req, res) => {

  db.query(`select sum(purchase_item.total) as sumTotal from purchase_item`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getcountofPurchases', (req, res) => {

  db.query(`select count(purchase_item.purchase_id) from purchase_item;`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getpurchasedataacceptorreject', (req, res) => {
  db.query(`SELECT po.purchase_id , po.is_sent , po.sent_by , po.sent_date , po.created_by , po.created_date, po.supplier_id , po.po_approval_date, su.supplier_name,su.category
  ,po.invoice_no, po.modified_date, po.filename
  FROM  purchase_order as po 
   join supplier as su on su.supplier_id = po.supplier_id where po.is_sent>1 order by purchase_id desc`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

// router.post('/getSumofpurchaseordersbyDate', (req, res) => {
//   console.log(req.body, "startdateand enddate")
//   let start_date = req.body.start_date;
//   let end_date = req.body.end_date;

//   db.query(`select sum(purchase_item.total) as sumtotal from purchase_item 
//     join purchase_order as po on po.purchase_id = purchase_item.purchase_id where po.filename IS NOT NULL and po.is_sent=2 and po.created_date 
//     between'${start_date}' and '${end_date}'`, (err, result) => {


//     if (err) {
//       throw err;
//     }
//     res.status(200).json(result.rows);
//   });
// });

router.post('/getSumofpurchaseordersbyDate', (req, res) => {
  console.log(req.body, "startdateand enddate")
  let start_date = req.body.start_date;
  let end_date = req.body.end_date;

  db.query(`SELECT 
  po.currency,
  SUM(purchase_item.total) AS sumtotal
FROM 
  purchase_item
JOIN 
  purchase_order AS po 
  ON po.purchase_id = purchase_item.purchase_id
WHERE 
  po.filename IS NOT NULL 
  AND po.is_sent = 2 
  AND po.created_date BETWEEN '${start_date}' and '${end_date}'
GROUP BY 
  po.currency;`, (err, result) => {


    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});



//count of items = no, of quantity bought.
router.post('/getcountofItemsbyDate', (req, res) => {
  let start_date = req.body.start_date;
  let end_date = req.body.end_date;
  // let query = "select sum(purchase_item.quantity) as sumquantity from purchase_item join purchase_order as po on po.purchase_id = purchase_item.purchase_id where po.is_sent=2 and purchase_item.product_received_date between '2023-04-01' and '2024-03-31'/"
  // db.query(`select count(purchase_item.purchase_id) from purchase_item where purchase_item.product_received_date between '${start_date}' and '${end_date}'`, (err, result)=>{
  db.query(`select sum(purchase_item.quantity) as sumquantity from purchase_item
   join purchase_order as po on po.purchase_id = purchase_item.purchase_id where po.is_sent=2 and po.created_date 
   between '${start_date}' and '${end_date}'`,
    (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});

router.get('/getreportItemwithPrice', (req, res) => {
  db.query(`SELECT * FROM getreportitemwithprice()`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


// router.get('/getreportItemwithPriceTwo', (req, res) => {
//   db.query(`SELECT * FROM getreportitemwithprice2()`, (err, result) => {

//     if (err) {
//       throw err;
//     }
//     res.status(200).json(result.rows);
//   });
// });


router.get('/getreportItembypoinvoicemovetoinventoryforaperiod', (req, res) => {
  db.query(`SELECT * FROM getreportitemwithprice2()`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});


router.get('/getreportpendingStock', (req, res) => {

  db.query(`SELECT * FROM getreportpendingStock()`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getreportStockinhand', (req, res) => {

  db.query(`SELECT * FROM getreportpendingstocknew()`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });

});

router.post('/getfullassetbyDate', (req, res) => {
  let start_date = req.body.start_date;
  let end_date = req.body.end_date;

  db.query(`SELECT * FROM getreportcompleteasset('${start_date}','${end_date}' )`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/gettotalpriceanditemsfrompi', (req, res) => {
  db.query(`select sum(total),count(id)from purchase_item`, (err, result) => {
    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });

});

router.get('/getcompanyData', (req, res) => {
  db.query(`SELECT * FROM  company_registration;`
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });

});


router.post('/getcompanyDatabycompanyName', (req, res) => {
  let company_name = req.body.company_name;
  console.log(company_name, "company name")

  // db.query(`SELECT * FROM getcompany_data_by_companyname('${company_name}')`
  db.query(`SELECT * FROM getcompany_data_by_companyname($1)`, [company_name]
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});

// modified on 04/07/2024
router.post('/getsystemDatabyitemId', (req, res) => {
  let item_id = req.body.item_id;
  console.log(req.body);

  db.query(`SELECT * FROM get_sytemdata_byitemid(${item_id})`
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});



router.post('/getsystemDataotherThanCPU', (req, res) => {
  // console.log(req.body);
  let item_id = req.body.item_id;

  db.query(`SELECT * FROM get_sytemdata_byitemidotherthancpu4($1)`, [item_id]
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});


router.post('/getTransferHistory', async (req, res) => {
  let item_id = req.body.item_id;
  const query = `SELECT 
        ts.item_id, 
        it.item_code, 
        it.item_name, 
        it.created_date,
        ts.transfer_to_system,
		    ts.transfer_to_user,
		    us2.user_name,
        et.item_code AS system_name, 
        ts.transfer_id,
        ts.transfer_date, 
        ts.transfer_by, 
        ts.transfer_category, 
        us.user_name AS transfer_byuser,
		loc.location_id,
		loc.location_name
    FROM 
        (
            SELECT 
                ts.item_id, 
                ts.transfer_id,
                ts.transfer_to_system, 
				ts.transfer_to_user,
                ts.transfer_by,
                ts.transfer_date,
				ts.transfer_category,
				ts.location_id,
                ROW_NUMBER() OVER (PARTITION BY ts.item_id ORDER BY ts.transfer_id DESC) AS rn
            FROM 
                transfer_stock AS ts
            WHERE 
                ts.item_id = $1
        ) AS ts
    LEFT JOIN 
        items AS it ON ts.item_id = it.item_id
    LEFT JOIN 
        items AS et ON et.item_id = ts.transfer_to_system
	LEFT JOIN
		users as us2 ON us2.user_id = ts.transfer_to_user
    LEFT JOIN 
        users AS us ON ts.transfer_by::integer = us.user_id
	LEFT JOIN
		location as loc on ts.location_id = loc.location_id order by ts.transfer_date desc`;
  // db.query(`SELECT * FROM get_transferhistory_byitemid($1)`, [item_id]
  try {
    const result = await db.query(query, [item_id]);
    console.log(result.rows, "transferHistory")
    return res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error executing query', error);
    return res.status(500).json({ error: 'Internal Server Error in getTransferHistory' });
  }


  // db.query(query, [item_id]
  //   , (err, result) => {

  //     if (err) {
  //       throw err;
  //     }
  //     res.status(200).json(result.rows);
  //   });
});

router.post('/getSystemConfiguration', (req, res) => {
  console.log(req.body);
  let transfer_to = req.body.transfer_to;
  console.log(transfer_to, "transfer_to")

  db.query(`SELECT * FROM getsytem_configuration3($1)`, [transfer_to]
    , (err, result) => {

      if (err) {
        throw err;
      }
      console.log(result.rows);
      res.status(200).json(result.rows);
    });
});

router.get('/getSystemDataFromtransferStock', (req, res) => {
  db.query(`SELECT * FROM get_sytemdata_fromtransferStock()`
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});

router.get('/getCountofassetItems', (req, res) => {

  //total assets purchase and their grand total
  // db.query(`select dt.item_name, sum(quantity) as quantity, sum(total) as sum_withgst, sum(sub_total) as sum_withoutgst from ( select items.item_name, count(items.item_name) as quantity, purchase_item.total, purchase_item.sub_total from items, products, purchase_item
  // where items.item_name = products.product_name and items.purchase_id = purchase_item.purchase_id and  products.is_asset=1 and 
  // items.location_id=1 or items.location_id=2 group by items.item_name, purchase_item.total,purchase_item.sub_total) as dt group by dt.item_name`
  //   , (err, result) => {

  // db.query(`select dt.item_name, sum(quantity) as quantity, sum(total) as sum_withgst, sum(sub_total) as sum_withoutgst from
  //     (select items.item_name,purchase_item.purchase_id,count(items.item_name) as quantity, purchase_item.total, purchase_item.sub_total 
  //     from items
  //     join products on items.item_name = products.product_name 
  //     join purchase_item on items.purchase_id = purchase_item.purchase_id
  //     where products.is_asset=1 and (items.location_id=1 or items.location_id=2) group by items.item_name
  //     , quantity,purchase_item.total, purchase_item.sub_total,purchase_item.purchase_id)as dt group by dt.item_name`
  //   , (err, result) => {

  db.query(`SELECT 
    dt.item_name,
    COUNT(*) AS quantity,
    SUM(dt.sum_withgst) AS sum_withgst,
    SUM(dt.sum_withoutgst) AS sum_withoutgst
FROM (
    SELECT 
        items.item_code,
        items.item_name,
		COALESCE(SUM(purchase_item.quantity), 0) AS avgquantity,	
        1 AS quantity, 
 		COALESCE(SUM(purchase_item.total) / NULLIF(SUM(purchase_item.quantity), 0), 0) AS sum_withgst,  
    	COALESCE(SUM(purchase_item.sub_total) / NULLIF(SUM(purchase_item.quantity), 0), 0) AS sum_withoutgst  
    FROM 
        items
    LEFT JOIN 
        products ON items.item_name = products.product_name 
    LEFT JOIN 
        purchase_item ON items.purchase_id = purchase_item.purchase_id
    WHERE 
        products.is_asset = 1 
        AND items.location_id IN (1, 2)
    GROUP BY 
        items.item_code, 
        items.item_name) AS dt
GROUP BY 
    dt.item_name;`
    , (err, result) => {

      if (err) {
        throw err;
      }

      res.status(200).json(result.rows);
    });
});

// NEW CODE FOR ASSETS COUNT WITH DIFFERENT CURRENCY

router.get('/getCountofassetItemswithcurrency', (req, res) => {

  db.query(`select * FROM getreportoffullassets();`
    , (err, result) => {

      if (err) {
        throw err;
      }

      res.status(200).json(result.rows);
    });
});


router.post('/getLocationbyitemid', (req, res) => {
  const item_id = req.body.item_id;

  db.query(` SELECT it.location_id, loc.location_name FROM items as it
  join "location" as loc on it.location_id = loc.location_id
  where item_id = ${item_id}`
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});

router.post('/getItemsDatabyitemid', (req, res) => {
  const item_id = req.body.item_id;

  db.query(`Select * from items where item_id = ${item_id}`
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});


router.post('/getActiveVendorbydate', (req, res) => {
  const { start_date, end_date } = req.body;

  db.query(`Select * from get_active_vendor_by_date($1,$2)`, [start_date, end_date]
    , (err, result) => {

      if (err) {
        throw err;
      }
      res.status(200).json(result.rows);
    });
});

router.get('/getitemswithwarranty', (req, res) => {

  db.query(`Select * from get_items_with_warranty() where item_status='1' order by item_id desc`, (err, result) => {

    if (err) {
      throw err;
    }
    res.status(200).json(result.rows);
  });
});

router.get('/getsysteminformationlist', (req, res) => {
  // const queryforsystemdata = `SELECT *,us.user_name from system_info si left join users us on us.user_id = si.username::integer  where si.system_status = '1' order by si.sid desc`;
  // modified on 2024-08-06
  const queryforsystemdata = `SELECT *,us.user_name, it.location_id from system_info si 
                              left join users us on us.user_id = si.username::integer  
                              left join  items it on it.item_code = si.cpucode
                              where si.system_status = '1' and location_id in(1,2,3) order by si.sid desc `;

  db.query(queryforsystemdata, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

//modifiedon04/07/2024
router.get('/getassigneditemsfromts', (req, res) => {

  db.query(`select it.item_id, it.item_code as name, it1.item_name, ts.transfer_to_system, it1.item_code from transfer_stock as ts
  join items it on it.item_id = ts.item_id
  join items it1 on it1.item_id = ts.transfer_to_system where ts.location_id = 2 or ts.location_id = 3`, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

// createdon06/07/2024
router.get('/getassigneditemstousersfromts', (req, res) => {

  db.query(`select it.item_id, it.item_code as name, it.item_name, ts.transfer_to_user, us.user_name from transfer_stock as ts
  join items it on it.item_id = ts.item_id
  join users us on us.user_id = ts.transfer_to_user where ts.location_id = 2 or ts.location_id = 3`, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.get('/getassigneditemsfromsysteminfo', (req, res) => {
  //  const allassigneditemsfromsystmeinfo =  `SELECT sid,
  //  CASE WHEN ram1code NOT LIKE 'RAM%' OR ram1code LIKE '-%' THEN NULL ELSE ram1code END AS ram1code,
  //  CASE WHEN ram2code NOT LIKE 'RAM%' OR ram2code LIKE '-%' THEN NULL ELSE ram2code END AS ram2code,
  //  CASE WHEN ram3code NOT LIKE 'RAM%' OR ram3code LIKE '-%' THEN NULL ELSE ram3code END AS ram3code,
  //  CASE WHEN ram4code NOT LIKE 'RAM%' OR ram4code LIKE '-%' THEN NULL ELSE ram4code END AS ram4code,
  //  CASE WHEN smpscode NOT LIKE 'SMPS%' OR smpscode LIKE '-%' THEN NULL ELSE smpscode END AS smpscode,
  //  CASE WHEN hdd1code NOT LIKE 'HDD%' OR hdd1code LIKE '-%' THEN NULL ELSE hdd1code END AS hdd1code,
  //  CASE WHEN hdd2code NOT LIKE 'HDD%' OR hdd2code LIKE '-%' THEN NULL ELSE hdd2code END AS hdd2code,
  //  CASE WHEN graphiccardcode NOT LIKE 'GRAPHICSCARD%' OR graphiccardcode LIKE '-%' THEN NULL ELSE graphiccardcode END AS graphiccardcode,
  //  CASE WHEN graphiccardcode NOT LIKE 'Graphic%' OR graphiccardcode LIKE '-%' THEN NULL ELSE graphiccardcode END AS graphiccardcode
  // FROM system_info
  // WHERE
  //  ram1code LIKE 'RAM%'
  //  OR ram2code LIKE 'RAM%'
  //  OR ram3code LIKE 'RAM%'
  //  OR ram4code LIKE 'RAM%'
  //  OR smpscode LIKE 'SMPS%'
  //  OR graphiccardcode LIKE 'GRAPHICSCARD%'
  //  OR graphiccardcode LIKE 'Graphic%' `;

  const allassigneditemsfromsystmeinfo = `select ram1code, ram2code, ram3code, ram4code, hdd1code, hdd2code, smpscode, graphiccardcode from system_info`;


  db.query(allassigneditemsfromsystmeinfo, (err, results) => {

    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  });
});

router.post('/getItemdatafromitemcode', (req, res) => {

  const item_code = req.body.item_code;
  console.log(req.body, "Item-code")

  db.query(`select * from items where item_code = $1`, [item_code], (err, results) => {
    if (err) {
      throw err;
    }
    console.log(results.rows, "itemidfromitemcode");
    res.status(200).json(results.rows);
  });
});

// modified04/07/2024
router.get('/getallusershavingsystem', (req, res) => {
  // const query = ` WITH RankedTransfers AS (
  //   SELECT ts.item_id, it.item_code, ts.transfer_to, us.user_name, ROW_NUMBER() OVER (PARTITION BY it.item_code ORDER BY it.item_id DESC) AS rn
  //   FROM transfer_stock ts
  //     JOIN users us ON us.user_id = ts.transfer_to
  //     JOIN items it ON it.item_id = ts.item_id
  //     LEFT JOIN system_info sys ON us.user_id::text = sys.username WHERE it.item_name = 'CPU' OR it.item_name = 'LAPTOP' OR it.item_name = 'ALL IN ONE PC'
  // )
  // SELECT item_id,item_code,transfer_to,user_name FROM RankedTransfers WHERE rn = 1 order by item_id desc`;

  const query = `WITH RankedTransfers AS (
    SELECT ts.item_id, it.item_code, it.location_id,
    ts.transfer_to_user, us.user_name, 
    ROW_NUMBER() OVER (PARTITION BY it.item_code ORDER BY ts.transfer_id DESC) AS rn
    FROM transfer_stock ts
      JOIN users us ON us.user_id = ts.transfer_to_user
      JOIN items it ON it.item_id = ts.item_id
      LEFT JOIN system_info sys ON us.user_id::text = sys.username WHERE it.item_name = 'CPU' OR it.item_name = 'LAPTOP' OR it.item_name = 'ALL IN ONE PC'
  )
  SELECT item_id,item_code,transfer_to_user,user_name,location_id FROM RankedTransfers WHERE rn = 1 order by item_id desc`;

  db.query(query, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).json(results.rows);
  })
})

//modfied04/07/2024
router.get('/getTransferStockdata', (req, res) => {
  const query = `SELECT ts.transfer_id,ts.item_id,it.item_code AS transferred_item,ts.transfer_date, ts.transfer_to_system, ts.transfer_to_user, it2.item_code AS transferred_item_to,us.user_name,
ts.transfer_by,us2.user_name AS transfer_by_user, loc.location_name
FROM transfer_stock ts
LEFT JOIN items it ON it.item_id = ts.item_id
LEFT JOIN items it2 ON it2.item_id = ts.transfer_to_system
LEFT JOIN users us ON us.user_id = ts.transfer_to_user
LEFT JOIN users us2 ON us2.user_id = ts.transfer_by::integer
LEFT JOIN "location" loc on loc.location_id = ts.location_id
order by ts.transfer_date  desc, ts.transfer_id desc;`

  db.query(query, (err, result) => {
    if (err) {
      throw err;
    }

    res.status(200).json(result.rows);
  });
});


router.get('/getScrapedgiftedsoldoutdatafromitems', (req, res) => {
  // const query = `select DISTINCT on(item_id)it.item_id, 
  // it.item_code, it.item_name, it.location_id, loc.location_name,
  // ts.transfer_date,ts.transfer_by, us.user_name from items it
  // left join transfer_stock ts on it.item_id = ts.item_id
  // left join "location" loc on loc.location_id = it.location_id
  // left join users us on us.user_id = ts.transfer_by::integer
  // where it.location_id in(4,5,6)
  // ORDER BY item_id DESC`;

  const query = `select DISTINCT on(item_id)it.item_id, 
it.purchase_id, po.invoice_date , po.created_date as purchase_date,
  it.item_code, it.item_name, it.location_id, loc.location_name,
  ts.transfer_date,ts.transfer_by, us.user_name from items it
  left join transfer_stock ts on it.item_id = ts.item_id
  left join "location" loc on loc.location_id = it.location_id
  left join purchase_order po on po.purchase_id = it.purchase_id
  left join users us on us.user_id = ts.transfer_by::integer
  where it.location_id in(4,5,6,7,8)
  ORDER BY item_id DESC`;

  db.query(query, (err, result) => {
    if (err) {
      throw err;
    }

    res.status(200).json(result.rows);
  });
});



router.post('/generate-next-item-code', async (req, res) => {
  console.log()
  const item_name = req.body.item_name;
  let query = `SELECT last_item_code FROM products WHERE product_name=$1`;
  let queryforupdate = `UPDATE products SET last_item_code = $1 WHERE product_name=$2`;
  const itemNames = ['CPU', 'LAPTOP', 'ALL IN ONE PC'];
  const itemNames2 = ['SSD HDD', 'HDD'];
  let numerical; // Declare numerical variable here
  let newItemCode; // Declare newItemCode here
  let nonNumericalPart; // Declare nonNumericalPart here

  try {
    await db.query('BEGIN');

    if (itemNames.includes(item_name)) {
      for (const items of itemNames) {
        let query = `SELECT last_item_code FROM products WHERE product_name=$1`;
        const { rows } = await db.query(query, [items]);

        if (rows.length === 0) {
          throw new Error(`No product found for the given item_name: ${items}`);
        }



        let lastItemCode = rows[0].last_item_code;

        // Extract the non-numerical and numerical parts from the last item code
        const match = lastItemCode.match(/^([^\d]+)(\d+)$/);
        if (!match || match.length !== 3) {
          throw new Error("Failed to extract parts from the last item code");
        }
        nonNumericalPart = match[1];

        let numericalPart = match[2]

        // Increment the numerical part
        numerical = (parseInt(numericalPart) + 1).toString().padStart(numericalPart.length, '0');

        // Form the new item code by concatenating string part and incremented numerical part
        newItemCode = `${nonNumericalPart}${numerical}`;
        console.log(newItemCode);

        // Update the last item code
        await db.query(queryforupdate, [newItemCode, items]);
      }
    }

    else if (itemNames2.includes(item_name)) {
      for (const items of itemNames2) {
        let query = `SELECT last_item_code FROM products WHERE product_name=$1`;
        const { rows } = await db.query(query, [items]);

        if (rows.length === 0) {
          throw new Error(`No product found for the given item_name: ${items}`);
        }
        let lastItemCode = rows[0].last_item_code;
        nonNumericalPart = 'HDD-'; // Always set non-numerical part to 'HDD-'

        // Extract the non-numerical and numerical parts from the last item code
        const match = lastItemCode.match(/^([^\d]+)(\d+)$/);
        if (!match || match.length !== 3) {
          throw new Error("Failed to extract parts from the last item code");
        }

        let numericalPart = match[2]

        // Increment the numerical part
        numerical = (parseInt(numericalPart) + 1).toString().padStart(numericalPart.length, '0');

        // Form the new item code by concatenating string part and incremented numerical part
        newItemCode = `${nonNumericalPart}${numerical}`;
        console.log(newItemCode);
        await db.query(queryforupdate, [newItemCode, items]);
      }

    }
    else {
      const { rows } = await db.query(query, [item_name]);
      if (rows.length === 0) {
        throw new Error('No product found for the given item_name');
      }

      const lastItemCode = rows[0].last_item_code;

      // // Extract the non-numerical and numerical parts from the last item code
      // const match = lastItemCode.match(/^([^\d]+)(\d+)$/);
      // if (!match || match.length !== 3) {
      //   throw new Error("Failed to extract parts from the last item code");
      // }
      // nonNumericalPart = match[1];
      // let numericalPart = match[2]

      //   // Increment the numerical part
      // numerical = (parseInt(numericalPart) + 1).toString().padStart(numericalPart.length, '0');

      // // Form the new item code by concatenating the modified non-numerical part and the numerical part
      // newItemCode = `${nonNumericalPart}${numerical}`;
      // console.log(newItemCode);

      // Split the lastItemCode into non-numerical and numerical parts
      const parts = lastItemCode.split('-');
      console.log(parts, "Ayush Enterprises");

      if (parts.length !== 2) {
        throw new Error("Failed to extract parts from the last item code");
      }

      // Extract the non-numerical and numerical parts
      nonNumericalPart = parts[0];
      let numericalPart = parts[1];

      // Increment the numerical part by converting it to a number, adding 1, and then converting it back to a string
      numerical = (parseInt(numericalPart) + 1).toString().padStart(numericalPart.length, '0');

      // Combine the non-numerical and incremented numerical parts to form the new item code
      newItemCode = `${nonNumericalPart.trim()}-${numerical}`; // Add trim() to remove any leading/trailing whitespace

      console.log(newItemCode);

      // Update the last item code
      await db.query(queryforupdate, [newItemCode, item_name]);
    }

    // Commit the transaction
    await db.query('COMMIT');
    // Construct the new item code based on the provided item_name
    // let newItemCode;
    if (itemNames.includes(item_name)) {
      newItemCode = `${item_name}-APV${numerical}`;
    }
    // else if (itemNames2.includes(item_name)) {
    //   newItemCode = `HDD-${numerical}`; // Update newItemCode for itemNames2
    // } else {
    //   newItemCode = `${nonNumericalPart}${numerical}`; // Update newItemCode for other item names
    // }

    res.status(200).json({ newItemCode });

  } catch (error) {
    console.error("Error generating next item code:", error);
    // Rollback the transaction on error
    await db.query('ROLLBACK');
    res.status(500).json({ error: "Internal server error" });
  }

});

router.post('/get-generated-next-item-code', async (req, res) => {
  console.log(req.body);
  const item_name = req.body.item_name;
  let query = `SELECT last_item_code FROM products WHERE product_name=$1`;
  const itemNames = ['CPU', 'LAPTOP', 'ALL IN ONE PC'];
  const itemNames2 = ['SSD HDD', 'HDD'];
  let numerical; // Declare numerical variable here
  let newItemCode; // Declare newItemCode here
  let nonNumericalPart; // Declare nonNumericalPart here

  try {
    await db.query('BEGIN');

    if (itemNames.includes(item_name)) {
      for (const items of itemNames) {
        let query = `SELECT last_item_code FROM products WHERE product_name=$1`;
        const { rows } = await db.query(query, [items]);

        if (rows.length === 0) {
          throw new Error(`No product found for the given item_name: ${items}`);
        }

        let lastItemCode = rows[0].last_item_code;

        // Extract the non-numerical and numerical parts from the last item code
        const match = lastItemCode.match(/^([^\d]+)(\d+)$/);
        if (!match || match.length !== 3) {
          throw new Error("Failed to extract parts from the last item code");
        }
        nonNumericalPart = match[1];

        let numericalPart = match[2]

        // Increment the numerical part
        numerical = (parseInt(numericalPart) + 1).toString().padStart(numericalPart.length, '0');

        // Form the new item code by concatenating string part and incremented numerical part
        newItemCode = `${nonNumericalPart}${numerical}`;
        console.log(newItemCode);

        // Update the last item code
      }
    }

    else if (itemNames2.includes(item_name)) {
      for (const items of itemNames2) {
        let query = `SELECT last_item_code FROM products WHERE product_name=$1`;
        const { rows } = await db.query(query, [items]);

        if (rows.length === 0) {
          throw new Error(`No product found for the given item_name: ${items}`);
        }
        let lastItemCode = rows[0].last_item_code;
        nonNumericalPart = 'HDD-'; // Always set non-numerical part to 'HDD-'

        // Extract the non-numerical and numerical parts from the last item code
        const match = lastItemCode.match(/^([^\d]+)(\d+)$/);
        if (!match || match.length !== 3) {
          throw new Error("Failed to extract parts from the last item code");
        }

        let numericalPart = match[2]

        // Increment the numerical part
        numerical = (parseInt(numericalPart) + 1).toString().padStart(numericalPart.length, '0');

        // Form the new item code by concatenating string part and incremented numerical part
        newItemCode = `${nonNumericalPart}${numerical}`;
        console.log(newItemCode);
      }

    }
    else {
      const { rows } = await db.query(query, [item_name]);
      if (rows.length === 0) {
        throw new Error('No product found for the given item_name');
      }

      const lastItemCode = rows[0].last_item_code;
      // Split the lastItemCode into non-numerical and numerical parts
      const parts = lastItemCode.split('-');

      if (parts.length !== 2) {
        throw new Error("Failed to extract parts from the last item code");
      }

      // Extract the non-numerical and numerical parts
      nonNumericalPart = parts[0];
      let numericalPart = parts[1];

      // Increment the numerical part by converting it to a number, adding 1, and then converting it back to a string
      numerical = (parseInt(numericalPart) + 1).toString().padStart(numericalPart.length, '0');

      // Combine the non-numerical and incremented numerical parts to form the new item code
      newItemCode = `${nonNumericalPart.trim()}-${numerical}`; // Add trim() to remove any leading/trailing whitespace

      console.log(newItemCode);

      // Update the last item code
    }
    // Commit the transaction
    await db.query('COMMIT');
    // Construct the new item code based on the provided item_name
    // let newItemCode;
    if (itemNames.includes(item_name)) {
      newItemCode = `${item_name}-APV${numerical}`;
    }
    res.status(200).json({ newItemCode });

  } catch (error) {
    console.error("Error generating next item code:", error);
    // Rollback the transaction on error
    await db.query('ROLLBACK');
    res.status(500).json({ error: "Internal server error" });
  }

});

router.get('/getlastrowfromgatepassid', async (req, res) => {
  try {
    const query = `SELECT * FROM tbl_gatepassid ORDER BY gatepass_id desc LIMIT 1`;
    const results = await db.query(query);
    res.status(200).json(results.rows);
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/getgatepassdatabyid', async (req, res) => {
  try {
    const gatepass_id = + req.body.gatepass_id;
    console.log(req.body);
    let getDataquery;
    let results;
    if (gatepass_id !== undefined && gatepass_id !== null && gatepass_id !== 0) {
      getDataquery = `select * , gpid.issued_to,gpid.issued_by,gpid.out_date, gpid.is_sent, gpid.party_name, gpid.gatepass_approval_date from gatepass as gp
       left outer join tbl_gatepassid as gpid on gpid.gatepass_id = gp.gatepass_id where gp.gatepass_id= $1 order by id desc`;
      results = await db.query(getDataquery, [gatepass_id]);

    }
    else {
      getDataquery = `select * , gpid.issued_to,gpid.issued_by, gpid.out_date, gpid.is_sent, gpid.is_sent,gpid.party_name, gpid.gatepass_approval_date from gatepass as gp
      left outer join tbl_gatepassid as gpid on gpid.gatepass_id = gp.gatepass_id order by id desc`;
      results = await db.query(getDataquery);
    }

    res.status(200).json(results.rows);
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/getgatepassdatafromtblgatepassid', async (req, res) => {
  try {
    const getDataquery = `select * from tbl_gatepassid order by tbl_gatepassid desc`;
    const results = await db.query(getDataquery);
    res.status(200).json(results.rows);
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/countsendgatepasses', async (req, res) => {
  try {
    const getDataquery = `SELECT count(gatepass_id)FROM tbl_gatepassid where tbl_gatepassid.is_sent=1`;
    const results = await db.query(getDataquery);
    res.status(200).json(results.rows);
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//createdat04/07/2024

router.post('/getitemsforusers', async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const query = `Select * from get_items_for_users($1) order by transfer_date desc`
    const result = await db.query(query, [user_id]);
    res.status(200).json(result.rows);
  }
  catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
})




router.get('/getLicensereport', async (req, res) => {
  try {
    const query = `select *, pr.product_name, pr.category_id, cat.category_name, loc.location_id , loc.location_name from items it
    left join products pr on it.item_name = pr.product_name
    left join category cat on cat.category_id = pr.category_id
	  left join location loc on loc.location_id = it.location_id
    where cat.category_id in (2,3030, 1004) order by date_ desc`;
    const results = await db.query(query);
    res.status(200).json(results.rows);
  }
  catch {
    console.error(error);
    res.status(500).json(error);
  }
});

router.get('/getLifecyclereport', async (req, res) => {
  try {
    const query = `select *, pr.product_name , pr.life_cycle, pr.category_id, cat.category_name, loc.location_id , loc.location_name  from items it
    left join products pr on it.item_name = pr.product_name
    left join category cat on cat.category_id = pr.category_id
    left join location loc on loc.location_id = it.location_id
   where cat.category_id in (1);`;

    const results = await db.query(query);
    res.status(200).json(results.rows);
  }
  catch {
    console.error(error);
    res.status(500).json(error);
  }
});

// router.get('/getGoodsandServices', async (req, res) => {
//   try {
//     const query = `select *, pr.product_name , pr.life_cycle, pr.category_id, cat.category_name, loc.location_id , loc.location_name  from items it
//     left join products pr on it.item_name = pr.product_name
//     left join category cat on cat.category_id = pr.category_id
//     left join location loc on loc.location_id = it.location_id
//     where category_name in ('Computer Hardware');`;

//     const results = await db.query(query);
//     res.status(200).json(results.rows);
//   }
//   catch {
//     console.error(error);
//     res.status(500).json(error);
//   }
// });

router.get('/getGoodsandServices', async (req, res) => {
  try {
    const query = `SELECT it.item_id , it.purchase_id , it.item_code , it.date_ , it.item_name , it.description , it.category_id , cat.category_name, it.location_id ,loc.location_name , it.invoice_no, po.invoice_amount , po.invoice_date, po.filename,po.filepath, it.warrantyend_date ,
				 it.item_status , it.created_by , it.created_date , it.complain_id  
				 FROM  public.items as it
				 left join public.location as loc on loc.location_id = it.location_id 
				 left join public.category as cat on cat.category_id = it.category_id
				left join public.purchase_order as po on po.purchase_id = it.purchase_id
        where it.location_id in(1,2,3)  and it.item_status='1'
            order by case 
          when it.purchase_id = 'NA' then 1 else 0 end, 
          purchase_id desc,
          item_code asc`;

    const result = await db.query(query);
    res.status(200).json(result.rows);
  }
  catch {
    console.error(error);
    res.status(500).json(error);
  }
})

router.get('/getallCurrency', async (req, res) => {
  try {
    const api = `https://restcountries.com/v3.1/all?fields=currencies`;
    const result = await axios.get(api,
      {
        httpsAgent: agent,
        // optional if you want to ignore self-signed certs
        rejectUnauthorized: false
      }
    );
    res.status(200).json(result.data);

  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
})

router.get('/getPurchaseIdsnotinItems', async(req, res)=>{
  try {
//     const query = `SELECT
//     t.purchase_id
// FROM (
//     SELECT 
//         TRIM(pi.purchase_id) AS purchase_id,
//         MIN(pi.id) AS min_id
//     FROM purchase_item pi
//     LEFT JOIN items it
//           ON TRIM(it.purchase_id) = TRIM(pi.purchase_id)
//     WHERE 
//          TRIM(pi.purchase_id) IS NOT NULL
//      AND TRIM(pi.purchase_id) <> ''
//      AND it.purchase_id IS NULL
//     GROUP BY TRIM(pi.purchase_id)
// ) AS t
// ORDER BY t.min_id`;

    const query = `SELECT DISTINCT TRIM(po.purchase_id) AS purchase_id
FROM purchase_order po
LEFT JOIN items it
       ON TRIM(it.purchase_id) = TRIM(po.purchase_id)
WHERE 
    po.is_sent = 2
    AND TRIM(po.purchase_id) IS NOT NULL
    AND TRIM(po.purchase_id) <> ''
    AND it.purchase_id IS NULL
ORDER BY TRIM(po.purchase_id);`

   const result = await db.query(query);
   res.status(200).json(result.rows);
    
  } catch (error) {
    console.error(error, 'Error at getPurchaseIdsnotinItems');
    res.status(500).json(error);
  }



})


module.exports = router;
