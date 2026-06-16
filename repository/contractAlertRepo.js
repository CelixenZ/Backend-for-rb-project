const prisma = require("../lib/prisma");

const getAllActiveAlertContract = async () => {
    const activeAlert = await prisma.contractExpiryAlert.findMany({
        where: { isActive: true },
        select: {
            id: true,
            userId: true,
            dayBeforeExpiry: true,
            contractId: true,
            user: {
                select: {
                    email: true
                }
            },
            contract: {
                select: {
                    title: true,
                    endDate: true
                }
            }
        }
    });
    return activeAlert;
}

const getAllAlertByContractIdForUser = async (userId, contractId) => {
    const activeAlert = await prisma.contractExpiryAlert.findMany({
        where: {
            AND: [
                { contractId: parseInt(contractId) },
                { userId: parseInt(userId) }
            ]
        },
        select: {
            id: true,
            dayBeforeExpiry: true,
            isActive: true,
        }
    });
    return activeAlert;
}

const createAlertLogs = async (alertLogs) => {
    await prisma.contractAlertLog.createMany({
        data: alertLogs
    });
}

/*
* purpose: disable many alerts at the same time
* param: ids: id[], int[], array of ContractExpiryAlert id
*/
const disableAlertsByIDs = async (ids) => {
    await prisma.contractExpiryAlert.updateMany({
        where: {
            id: { in: ids }
        },
        data: {
            isActive: false
        }
    });
}

module.exports = {
    getAllActiveAlertContract: getAllActiveAlertContract,
    createAlertLogs: createAlertLogs,
    disableAlertsByIDs: disableAlertsByIDs,
    getAllAlertByContractIdForUser: getAllAlertByContractIdForUser
}