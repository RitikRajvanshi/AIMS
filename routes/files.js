var express = require('express');
var router = express.Router();
var db = require('../dbconfig');
const jwt = require('jsonwebtoken');
const secretKey = "5d8424d84c1b3e816490ed0b072dc7113c48d73e37633bfb41f6b7abdaaa8c9515d5b0c2ab89901f8eaf61cc638b02f495d1719c82076f00d70277bbb63c09cc";
const Exceljs = require('exceljs');
const moment = require('moment');


function ensureToken(req, res, next) {
    const bearerHeader = req.headers["authorization"];

    if (typeof bearerHeader !== 'undefined') {
        // console.log('bearerHeader', bearerHeader);

        const bearer = bearerHeader.split(" ");

        // console.log('bearer', bearer);

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


//file upload through multer
const multer = require('multer');

const fileUpload = multer({

    storage: multer.diskStorage({

        destination: (req, file, cb) => {

            cb(null, 'files/invoice/');
        },

        filename: (req, res, cb) => {
            cb(null, new Date().valueOf() + '_' + res.originalname);
        }
    })
});

const documentUpload = multer({

    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'files/documents/');
        },

        filename: (req, res, cb) => {

            cb(null, new Date().valueOf() + '_' + res.originalname);
            //new Date().valueOf() gives primitive value of present date(milliseconds from 01 January, 1970 ) 


        }
    })
});

const logoUpload = multer({

    storage: multer.diskStorage({

        destination: (req, file, cb) => {

            cb(null, 'files/companyData/');
        },

        filename: (req, res, cb) => {

            // console.log(res);
            cb(null, new Date().valueOf() + '_' + res.originalname);

            //new Date().valueOf() gives primitive value of present date(milliseconds from 01 January, 1970 ) 


        }
    })
});

const quotationUpload = multer({

    storage: multer.diskStorage({

        destination: (req, file, cb) => {

            cb(null, 'files/quotations/');
        },

        filename: (req, res, cb) => {

            // console.log(res);
            cb(null, new Date().valueOf() + '_' + res.originalname);

            //new Date().valueOf() gives primitive value of present date(milliseconds from 01 January, 1970 ) 


        }
    })
});

// file Upload Routes

// single file upload --> fileUpload.single('file')
//mutilple file upload --> fileupload.array('file1','file2', 'file3', .....)

// router.post('/uploadInvoice',  fileUpload.single('file'), (req, res) => { 

router.post('/uploadInvoicefileandgetdata', fileUpload.single('file'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    // console.log(req.file)
    const { filename, mimetype } = req.file;
    const filepath = req.file.path;
    const firstpartpath = filepath.substring(0, filepath.indexOf('invoice\\'));
    const secondpartpath = filepath.substring(filepath.indexOf('invoice\\') + 8)
    const slicePath = firstpartpath + secondpartpath;
    console.log(slicePath, "invoice uploaded path");

    // const filesizeKb = req.file.size / 1024;  
    return res.json({
        message: 'File uploaded succesfully..',
        filename,
        filepath: slicePath,
        mimetype,
    });

});

//upload document and getData

router.post('/uploadDocumentandgetdata', documentUpload.single('file'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: 'No document uploaded' });
    }

    const { filename, mimetype } = req.file;
    const filepath = req.file.path;
    const slicePath = filepath.slice(6);
    console.log(filepath, "filepath")

    return res.json({
        message: 'Document uploaded succesfully..',
        filename,
        filepath: slicePath,
        mimetype,
    });

});

router.post('/uploadQuotationandgetdata', quotationUpload.single('file'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: 'No quotation uploaded' });
    }

    console.log(req.file)
    const { filename, mimetype } = req.file;
    const filepath = req.file.path;
    const slicePath = filepath.slice(6);
    return res.json({
        message: 'Quotation uploaded succesfully..',
        filename,
        filepath: slicePath,
        mimetype,
    });


});

router.post('/uploadlogoandgetData', logoUpload.fields([{ name: 'file' }, { name: 'file2' }]), async (req, res) => {
    try {

        //Accessing file and also checks which file is available or not.
        const file1 = req.files['file'] ? req.files['file'][0] : null;
        const file2 = req.files['file2'] ? req.files['file2'][0] : null;

        const responseData = {};

        if (file1) {
            const FilePath1 = file1.path.slice(6);
            // const FileName1 = file1.filename;
            responseData.filename = FilePath1.split('\\')[1];
            responseData.filepath = FilePath1;
        }

        if (file2) {
            const FilePath2 = file2.path.slice(6);
            // const FileName2 = file2.filename;
            responseData.filename2 = FilePath2.split('\\')[1];
            responseData.filepath2 = FilePath2;
        }

        if (Object.keys(responseData).length > 0) {
            return res.json({
                message: 'Files uploaded successfully',
                ...responseData,
            });
        } else {
            res.status(400).json({ message: 'No valid files uploaded' });
        }
    } catch (error) {
        console.error('Error handling file upload', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.post('/updateInvoicenoinpo', (req, res) => {
    console.log(req.body, "invoice0");

    const { purchase_id, invoice_no, modified_by, invoice_remark, invoice_amount, invoice_date } = req.body;

    db.query(`SELECT * FROM update_invoice_no_in_po($1,$2,$3,$4, $5, $6)`, [purchase_id, invoice_no, modified_by, invoice_remark, invoice_amount, invoice_date], (err, results) => {
        if (err) {
            throw err;
        }
    })
    res.status(200).send({ message: 'Inovice Updated Successfully' });


});

router.post('/uploadInvoicedatainpo', (req, res) => {
    console.log(req.body, "uploadInvoicedatainpo");
    const { purchase_id, invoice_no, modified_date, modified_by, filename, filepath, mimetype, invoice_remark, invoice_date, invoice_amount } = req.body;

    db.query(`SELECT * FROM update_invoicedata_in_po($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [purchase_id, invoice_no, modified_date, modified_by, filename, filepath,
        mimetype, invoice_remark, invoice_date, invoice_amount], (err, results) => {
            if (err) {
                throw err;
            }
        })
    res.status(200).send({ message: 'Inovice Uploaded Successfully', filename, invoice_remark });
});

//document
router.post('/uploadDocumentData', (req, res) => {
    console.log(req.body);
    const { document_name, document_path, mimetype, category_id, description, created_by } = req.body;

    db.query(`SELECT * FROM upload_scan_document($1,$2,$3,$4,$5,$6)`, [document_name, document_path, mimetype, category_id, description, created_by]
        , (err, results) => {
            if (err) {
                throw err;
            }
        })
    res.status(200).send({ message: 'Document Uploaded Successfully', document_name });


});


router.post('/updateDocotherthanfile', (req, res) => {

    const { document_id, category_id, description } = req.body;

    db.query(`SELECT * FROM update_document_otherthanfile($1,$2,$3)`, [document_id, category_id, description]
        , (err, results) => {
            if (err) {
                throw err;
            }
        })
    res.status(200).send({ message: 'Document Updated Successfully' });


});


router.post('/updateFullDocument', fileUpload.single('file'), (req, res) => {

    const { document_id, document_name, document_path, mimetype, category_id, description } = req.body;

    db.query(`SELECT * FROM update_full_document_by_docId($1,$2,$3,$4,$5,$6)`,
        [document_id, document_name, document_path, mimetype, category_id, description], (err, results) => {
            if (err) {
                throw err;
            }
        })
    res.status(200).send({ message: 'Document Updated Successfully', document_name });


});


//quotation
router.post('/uploadQuotation', fileUpload.single('file'), (req, res) => {

    const { quotation_name, quotation_path, mimetype, request_id, description, created_by } = req.body;

    db.query(`SELECT * FROM upload_scan_quotation($1,$2,$3,$4,$5,$6)`, [quotation_name, quotation_path, mimetype, request_id, description, created_by],
        (err, results) => {
            if (err) {
                throw err;
            }
        })
    res.status(200).send({ message: 'Quotation Uploaded Successfully', quotation_name });


});

router.post('/updateQuotationotherthanfile', (req, res) => {

    const { quotation_id, request_id, description } = req.body;

    db.query(`SELECT * FROM update_quotation_otherthanfile($1,$2,$3)`, [quotation_id, request_id, description], (err, results) => {
        if (err) {
            throw err;
        }
    })
    res.status(200).send({ message: 'Quotation Updated Successfully' });


});

router.post('/updateFullQuotation', fileUpload.single('file'), (req, res) => {

    const { quotation_id, quotation_name, quotation_path, mimetype, request_id, description } = req.body;

    db.query(`SELECT * FROM update_full_quotation_by_quotid($1,$2,$3,$4,$5,$6)`
        , [quotation_id, quotation_name, quotation_path, mimetype, request_id, description], (err, results) => {
            if (err) {
                throw err;
            }
        })
    res.status(200).send({ message: 'Quotation Updated Successfully', quotation_name });
});

// router.post('/exportToexcel', async (req, res) => {
//     // console.log(req.body);

//     const itemDataList = req.body;
//     const workBook = new Exceljs.Workbook();


//     const workSheet = workBook.addWorksheet('Items Report',
//         {headerFooter:{firstHeader:'Assets & Inventory Management System', firstFooter:'Report - Items with Price'}}
//     );

//     workSheet.firstHeader.font = { bold: true, size: 20 };

//     // workSheet.addRow(['Assets & Inventory Management System']).font = { bold: true, size: 24 };
//     workSheet.addRow(['Report - Items with Price']).font = { bold: true, size: 20 };
//     // workSheet.addRow([]);

//     // Define columns
//     workSheet.columns = [
//         { header: 'S.No.', key: 'sno', width: 10 },
//         { header: 'Item Code', key: 'item_code', width: 15 },
//         { header: 'Item Name', key: 'item_name', width: 30 },
//         { header: 'Vendor Name', key: 'supplier_name', width: 20 },
//         { header: 'Price (₹)', key: 'unit_price', width: 15 },
//         { header: 'Price (₹) with GST', key: 'total', width: 20 },
//         { header: 'Created Date', key: 'created_date', width: 15 },
//     ];

//     // Add data to the worksheet
//     itemDataList.forEach((item, index) => {
//         workSheet.addRow({
//             sno: index + 1,
//             item_code: item.item_code || 'NA',
//             item_name: item.item_name || 'NA',
//             supplier_name: item.supplier_name || 'NA',
//             unit_price: item.unit_price || 'NA',
//             total: item.total ? item.total.toFixed(2) : 'NA',
//             created_date: item.created_date || 'NA',
//         });
//     });

//     // Set styles for header
//     workSheet.getRow(1).font = { bold: true, size: 20 };
//     workSheet.getRow(2).font = { bold: true, size: 20 };
//     workSheet.getRow(1).alignment = { horizontal: 'center' };
//     workSheet.getRow(2).alignment = { horizontal: 'center' };

//     // Set header styles
//     workSheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
//     workSheet.getRow(4).fill = {
//         fillType: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FF00008B' }, // Dark blue background
//     };

//     // Example of setting a specific cell's style
//     workSheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FF0000FF' } }; // Blue text
//     workSheet.getCell('A1').fill = {
//         fillType: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFFFFF00' }, // Yellow background
//     };


//     // Set response headers
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename=report_items_with_price.xlsx');


//     // Write the workbook to the response
//     await workBook.xlsx.write(res);
//     res.end();
// })

// router.post('/exportToexcel', async (req, res) => {
//     // console.log(req.body);

//     const itemDataList = req.body;
//     console.log(req.body, "export");
//     const workBook = new Exceljs.Workbook();

//     const workSheet = workBook.addWorksheet('Report',
//     );
//     // Define the number of columns
//     const numberOfColumns = 9; // Update this if you change the number of columns
//     const lastColumnLetter = String.fromCharCode(65 + numberOfColumns - 1); // Convert to letter (A, B, C, ...)
//     console.log(lastColumnLetter, "lastColumnLetter");



//     // const titleRow1 = workSheet.getRow(1);
//     const imageId1 = workBook.addImage({
//         filename: 'files/companyData/AIMSBanner.jpg',
//         extension: 'jpg',
//     });

//     workSheet.addImage(imageId1, 'A1:I5');
//     workSheet.showRuler = false;

//     workSheet.mergeCells(`A6:${lastColumnLetter}6`)// Merge cells for the first title
//     workSheet.getCell(`${lastColumnLetter}6`).value = 'Report : Item with Price';
//     workSheet.getCell(`${lastColumnLetter}6`).font = { bold: true, size: 18 };

//     // workSheet.getCell('I6').fill = {
//     //     fillType: 'pattern',
//     //     pattern: 'solid',
//     //     fgColor: { argb: 'FFAEDBB3' }, // Use ARGB format for the color
//     //     bgColor:{argb: 'FFAEDBB3'}
//     // };
//     workSheet.getCell('A6').fill = {
//         type: 'pattern',
//         pattern:'gray125',
//         fgColor:{argb:'FFFF0000'}
//     };

//     workSheet.getRow(6).height = 30;
//     workSheet.getCell(`${lastColumnLetter}6`).alignment = { horizontal: 'center', vertical: 'center' };


//     workSheet.addTable({
//         name: 'MyTable',
//         ref: 'A7',
//         totalsRow: true,
//         style: {
//             theme: 'TableStyleLight20',
//             showRowStripes: true,
//         },
//         columns: [
//             { name: 'S.No.', totalsRowLabel: 'Totals:', filterButton: false },
//             { name: 'Item Code', filterButton: true },
//             { name: 'Item Name', filterButton: true },
//             { name: 'Vendor Name', filterButton: true },
//             { name: 'Price (₹)', totalsRowFunction: 'sum', filterButton: false },
//             { name: 'Price (₹) with GST', totalsRowFunction: 'sum', filterButton: false },
//             { name: 'Invoice Date', filterButton: false },
//             { name: 'PO Creation Date', filterButton: false },
//             { name: 'Transfer Date', filterButton: false },
//         ],
//         rows: itemDataList.map((item, index) => [
//             index + 1, // S.No.
//             item.item_code || 'NA',
//             item.item_name || 'NA',
//             item.supplier_name || 'NA',
//             item.unit_price || 0,
//             item.total || 0,
//             item.invoice_date || 'NA',
//             item.po_created_date || 'NA',
//             item.transfer_to_inventory_date || 'NA',
//         ]),
//     });

//     // Set column widths
//     workSheet.getColumn(1).width = 10; // S.No.
//     workSheet.getColumn(2).width = 35; // Item Code
//     workSheet.getColumn(3).width = 35; // Item Name
//     workSheet.getColumn(4).width = 35; // Vendor Name
//     workSheet.getColumn(5).width = 20; // Price (₹)
//     workSheet.getColumn(6).width = 20; // Price (₹) with GST
//     workSheet.getColumn(7).width = 15; // Created Date
//     workSheet.getColumn(8).width = 15; // Created Date
//     workSheet.getColumn(9).width = 15; // Created Date

//     // Set number formats for the price columns
//     workSheet.getColumn(5).numFmt = '0.00'; // Price (₹)
//     workSheet.getColumn(6).numFmt = '0.00'; // Price (₹) with GST



//     try {
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', 'attachment; filename=report_items_with_price.xlsx');
//         await workBook.xlsx.write(res);
//         res.end();
//     } catch (error) {
//         console.error("Error generating the Excel file: ", error);
//         res.status(500).send("Error generating Excel file");
//     }
// })

// Function to adjust column width based on the longest content in the column
function adjustColumnWidth(worksheet, columns, data) {
    columns.forEach((col, index) => {
        let maxLength = col.header ? col.header.length : 0; // Include header length

        // Loop through the data and calculate the max length for the current column
        data.forEach(item => {
            const cellValue = item[col.key] || ''; // Get the value in each row for the column
            maxLength = Math.max(maxLength, String(cellValue).length); // Update max length
        });

        // Set the column width to the maxLength plus a little padding (e.g., 2 characters)
        worksheet.getColumn(index + 1).width = maxLength + 2;
    });
}



router.post('/exportToexcel', async (req, res) => {
    const { reportTitle, columns, data, filters, totalsrow ,currencySummaryText} = req.body;
    let filterName="";

    console.log(req.body, "req.body");
    const workBook = new Exceljs.Workbook();

    const workSheet = workBook.addWorksheet('Report', {
        // pageSetup:{fitToPage: true, fitToHeight: 5, fitToWidth: 7}
        pageSetup: {
            orientation: 'landscape', // Set orientation to landscape
            // paperSize: 9, // Set paper size to A4
            paperSize: 9, // Set paper size to A3
            fitToPage: true, // Enable 'Fit to Page' 
            fitToHeight: 0,
            fitToWidth: 1,
            margins: {
                left: 0.7,
                right: 0.7,
                top: 0.75,
                bottom: 0.75,
                header: 0.3,
                footer: 0.3
            },
        }
    });

    const numberOfColumns = columns.length; // Update this if you change the number of columns

    const lastColumnLetter = String.fromCharCode(65 + numberOfColumns - 1); // Convert to letter (A, B, C, ...)
    console.log(numberOfColumns, lastColumnLetter);

    const numberOfRows = data ? data.length + 11 : 0;
    const laststartcolumnName = `A${numberOfRows}`;
    const lastendcolumnName = `${lastColumnLetter}${numberOfRows}`;
    // console.log(`A${numberOfRows}:${lastColumnLetter}${numberOfRows}`)

    // console.log(lastColumnLetter, "lastColumnLetter");

    try {
        const imageId1 = workBook.addImage({
            filename: 'files/companyData/aims-banner-final-webp.webp',
            extension: 'jpg',
        });
        workSheet.addImage(imageId1,   `A1:${lastColumnLetter}5`);
    } catch (err) {
        console.log("Image not found or error with image path", err);
    }


    // Merge cells for the report title (row 6) and center it.
    workSheet.mergeCells(`A6:${lastColumnLetter}6`);

    workSheet.getCell('A6').fill = {
        type: 'pattern',
        pattern: 'solid',
        // fgColor:{argb:'80b8f0'},
        fgColor: { argb: 'DBDBDB ' },
    };

    workSheet.getCell('A6').border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
    };

    // Get the current date and time, and format it as DD-MM-YYYY
    const formattedDateTime = moment().format('DD-MM-YYYY HH:mm:ss');
    workSheet.getCell('A6').value = reportTitle;  // Dynamic report title
    // Set the report title

    workSheet.mergeCells(`A7:${lastColumnLetter}7`);

    workSheet.getCell('A7').fill = {
        type: 'pattern',
        pattern: 'solid',
        // fgColor:{argb:'80b8f0'},
        fgColor: { argb: 'DBDBDB ' },
    };

   


    if (filters && Array.isArray(filters) && filters.length > 0 && filters[0].startDate && filters[0].endDate) {
        filterName = filters[0].filterBy.split("_").map((word,index)=> {
            return index===0?word.charAt(0).toUpperCase() + word.slice(1):word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' '); 
        console.log(filterName, "filterName");

        const filteredstartDate = moment(filters[0].startDate).format('DD-MM-YYYY');
        const filteredendDate = moment(filters[0].endDate).format('DD-MM-YYYY');
        // const filterName = filters[0].filterBy ? filters[0].filterBy.split('_')
        workSheet.getCell('A7').value = `Based on  ${filterName} from ${filteredstartDate} to ${filteredendDate}                                                                    Report created on ${formattedDateTime}`;  // Dynamic report title
    }
    else {
        if(filters && Array.isArray(filters) && filters.length > 0 && filters[0].filterBy){
            filterName = filters[0].filterBy.split("_").map((word,index)=> {
                return index===0?word.charAt(0).toUpperCase() + word.slice(1):word.charAt(0).toUpperCase() + word.slice(1);
            }).join(' '); 
            // const filterName = filters[0].filterBy.split('_');
            // console.log(filterName)
            workSheet.getCell('A7').value = `Based on  ${filterName}                                                                                                                         Report created on ${formattedDateTime}`;  // Dynamic report title
        }

            workSheet.getCell('A7').value = `                                                                                                                                            Report created on ${formattedDateTime}`;  // Dynamic report title
       
    }

    // Set dynamic column widths and apply filters if necessary
    columns.forEach((col, index) => {
        if (col && col.width) {
            workSheet.getColumn(index + 1).width = col.width || 13;  // Default width of 13

            // Enable filtering for columns that require it
            workSheet.getColumn(index + 1).filterButton = col.filterButton || false;
        }
        else {
            adjustColumnWidth(workSheet, columns, data);
        }
    });



    // console.log(numberOfRows, "lastRowsLetter")

    // Add the data rows dynamically
    data.forEach((item) => {
        const row = columns.map(col => {
            let value = item[col.key];  // Default to 'NA' if no value

            if (value === null || value === undefined || value === '') {
                value = 'NA';
            } else if (col.format === 'date') {
                value = new Date(value).toLocaleDateString();
            }
            else if(col.format === 'number'){
               
                value = Number(value); // Convert text to number
                if (isNaN(value)) value = 0; // Handle invalid numbers
            }

            // if (col.format === 'date') {
            //     value = new Date(value).toLocaleDateString();  // Format as date
            // }
            return value;
        });

        workSheet.addRow(row);
    });

    // Add the table structure with dynamic columns and rows
    workSheet.addTable({
        name: 'MyTable',
        ref: 'A8',
        totalsRow: totalsrow,
        style: {
            theme: 'TableStyleLight16',
            showRowStripes: true,
        },
        columns: columns.map(col => ({
            name: col.header,
            totalsRowFunction: col.totalsRowFunction && ['sum', 'average', 'count', 'min', 'max'].includes(col.totalsRowFunction) ? col.totalsRowFunction : undefined,  // Ensure valid function
            filterButton: col.filterButton || false,
        })),
        // rows: data.map(item => columns.map(col => item[col.key] || 'NA')),  // Dynamic data rows
        // rows: data.map(item => columns.map(col => (item[col.key] !== undefined && item[col.key] !== null) ? item[col.key] : 'NA'))
        rows: data.map(item =>
            columns.map(col => {
                const value = item[col.key];
                return (value !== undefined && value !== null && value !== '') ? value : 'NA';
            })
        )

    });
    

    // Optional: Apply alternating row colors
    workSheet.eachRow((row, rowNumber) => {
        row.height = 23;
        if (rowNumber > 7 && rowNumber !== numberOfRows) {
            if (rowNumber % 2 === 0) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F1F1' } };  // Light gray for even rows

                });

              
                // row.alignment = { vertical: 'middle' }
            }
            if (rowNumber % 2 === 1) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };  // Light gray for even rows

                });
            }
            

            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.font = { size: 14 };
                cell.alignment = {
                    vertical: 'center',
                    padding: {
                        left: 5,
                        right: 5,
                        top: 2,
                        bottom: 2
                    }
                };

            });
        }
       
        else if (rowNumber == 6) {
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.font = { bold: true, size: 18 };
                cell.alignment = {
                    vertical: 'center',
                    padding: {
                        left: 5,
                        right: 5,
                        top: 2,
                        bottom: 2
                    }
                };
            });
        }
        else if (rowNumber == 7) {
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.font = { size: 15 };
                cell.alignment = {
                    vertical: 'center',
                    padding: {
                        left: 5,
                        right: 5,
                        top: 2,
                        bottom: 2
                    }
                };

                cell.border = {
                    top: { style: 'thin', color: { argb: '000000' } },
                    left: { style: 'thin', color: { argb: '000000' } },
                    bottom: { style: 'thin', color: { argb: '000000' } },
                    right: { style: 'thin', color: { argb: '000000' } }
                };

            });
        }
        else if (rowNumber == numberOfRows) {
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.font = { size: 11 };
                cell.alignment = {
                    vertical: 'center',
                    padding: {
                        left: 5,
                        right: 5,
                        top: 2,
                        bottom: 2
                    }
                };
            });
        }
    });

    workSheet.getColumn(1).alignment = { horizontal: 'center', vertical: 'middle' };
    workSheet.getRow(6).height = 35;

    //for currency change reports
    if(currencySummaryText) {
    const currencyRowNumber = numberOfRows  - 2;
    const currencyStart = `A${currencyRowNumber}`;
    const currencyEnd = `${lastColumnLetter}${currencyRowNumber}`;
    workSheet.mergeCells(`${currencyStart}:${currencyEnd}`);
    workSheet.getCell(currencyStart).value = `Total Amount:  ${currencySummaryText}`;
    workSheet.getCell(currencyStart).font = { bold: true, size: 14,color: { argb: 'FFDC3562' } };
    workSheet.getCell(currencyStart).alignment = { vertical: 'middle', horizontal: 'right' };
    }

     //footer
     workSheet.mergeCells(`${laststartcolumnName}:${lastendcolumnName}`);
     workSheet.getCell(laststartcolumnName).value = "This report is only for internal purpose of APV Technologies Pvt. Ltd.";  // Dynamic report title

     workSheet.views = [
        { 
            state: 'frozen', 
            xSplit: 0, // Freeze 0 columns
            ySplit: 8, // Freeze 8 rows 
            topLeftCell: 'A9', // Top left cell of the unfrozen area
            activeCell: 'A9' 
        }
    ];

    try {
        // Set response headers to prompt the download of the file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${reportTitle.replace(/\s+/g, '_')}.xlsx`);

        // Write the workbook to the response
        await workBook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error generating the Excel file: ", error);
        res.status(500).send("Error generating Excel file");
    }
});


module.exports = router;