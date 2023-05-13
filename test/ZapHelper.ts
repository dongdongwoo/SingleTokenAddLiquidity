import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers'
import {ethers, upgrades} from "hardhat";
import { Contract } from '@ethersproject/contracts';
import {assert} from "chai";
import {BigNumber} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import * as mlog from 'mocha-logger'

const toUnit = (amount : any, unit = 'ether') => ethers.utils.parseUnits(amount.toString(), unit)
const fromUnit = (amount : any, unit = 'ether') => ethers.utils.formatUnits(amount.toString(), unit)
const bnEqual = (actual: BigNumber, expected: BigNumber, context?: string) => {
    assert.strictEqual(actual.toString(), expected.toString(), context)
}
const currentTime = async () => {
    const {timestamp} = await ethers.provider.getBlock('latest')
    return timestamp
}

const MaxUINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

describe("ZapHelper Test", function() {
    let deployer: SignerWithAddress, user1 : SignerWithAddress
    let zapHelper : Contract, mat : Contract, mbt : Contract, mat_mbt : Contract
    let UniswapV2ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    let UniswapV2Factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
    let uniswapFactory : Contract, uniswapRouter : Contract

    before("Set Contract & Token", async function(){
        [deployer, user1] = await ethers.getSigners()

        const ZapHelper = await ethers.getContractFactory("ZapHelper")
        zapHelper = await upgrades.deployProxy(ZapHelper, [UniswapV2ROUTER])

        const MAT = await ethers.getContractFactory("MesherERC20")
        const MBT = await ethers.getContractFactory("MesherERC20")
        mat = await upgrades.deployProxy(MAT, ["MAT"])
        mbt = await upgrades.deployProxy(MBT, ["MBT"])

        // MAT, MBT mint
        await mat.mint(deployer.address, toUnit(1100))
        await mbt.mint(deployer.address, toUnit(1000))
        await mat.transfer(user1.address, toUnit(100))

        bnEqual(await mat.balanceOf(deployer.address), toUnit(1000))
        bnEqual(await mbt.balanceOf(deployer.address), toUnit(1000))
        bnEqual(await mat.balanceOf(user1.address), toUnit(100))

        // create Pair (MAT-MBT Pair in uniSwapV2)
        uniswapFactory = await ethers.getContractAt("IUniswapV2Factory", UniswapV2Factory)
        uniswapRouter = await ethers.getContractAt("IUniswapV2Router", UniswapV2ROUTER)

        await uniswapFactory.createPair(mat.address, mbt.address)
        const pair = await uniswapFactory.getPair(mat.address, mbt.address)
        mat_mbt = await ethers.getContractAt("IUniswapV2Pair", pair)

        await mat.approve(UniswapV2ROUTER, MaxUINT)
        await mbt.approve(UniswapV2ROUTER, MaxUINT)

        mlog.log("deployer : ", deployer.address)
        mlog.log("user1 : ", user1.address)
        mlog.log("ZapHelper address : ", zapHelper.address)
        mlog.log("MAT Token address : ", mat.address)
        mlog.log("MBT Token address : ", mbt.address)
        mlog.log("MAT-MBT Pair address : ", mat_mbt.address)
    })

    describe("Start SingleTokenAddLiquidity Test", async function(){
        before("init addLiquidity in MAT-MBT", async function(){
            mlog.log(">> init addLiquidity ");
            const matBalance = await mat.balanceOf(deployer.address)
            const mbtBalance = await mbt.balanceOf(deployer.address)

            mlog.log("mat balance in pair before init : ", fromUnit(await mat.balanceOf(mat_mbt.address)))
            mlog.log("mbt balance in pair before init : ", fromUnit(await mbt.balanceOf(mat_mbt.address)))
            mlog.log("mat_mbt totalSupply before init : ", fromUnit(await mat_mbt.totalSupply()))
            await uniswapRouter.addLiquidity(
                mat.address,
                mbt.address,
                matBalance,
                mbtBalance,
                0,
                0,
                deployer.address,
                await currentTime() + 100
            )
            mlog.log("------- after addLiquidity -------")
            mlog.log("mat balance in pair after init : ", fromUnit(await mat.balanceOf(mat_mbt.address)))
            mlog.log("mbt balance in pair after init : ", fromUnit(await mbt.balanceOf(mat_mbt.address)))
            mlog.log("mat_mbt totalSupply after init : ", fromUnit(await mat_mbt.totalSupply()))
        })

        it("singleTokenAddLiquidity Test from User1", async function(){
            mlog.log(">> real Test ");
            bnEqual(await mat.balanceOf(zapHelper.address), toUnit(0))
            bnEqual(await mat_mbt.balanceOf(zapHelper.address), toUnit(0))

            mlog.log("user1 mat balance before : ", fromUnit(await mat.balanceOf(user1.address)))
            mlog.log("user1 mbt balance before : ", fromUnit(await mbt.balanceOf(user1.address)))
            mlog.log("user1 mat_mbt balance before : ", fromUnit(await mat_mbt.balanceOf(user1.address)))
            mlog.log("pair mat balance before  : ", fromUnit(await mat.balanceOf(mat_mbt.address)))
            mlog.log("pair mbt balance before  : ", fromUnit(await mbt.balanceOf(mat_mbt.address)))

            await mat.connect(user1).approve(zapHelper.address, MaxUINT)
            const amountIn = await mat.balanceOf(user1.address)
            await zapHelper.connect(user1).singleTokenAddLiquidity(
                mat_mbt.address,
                mat.address,
                amountIn,
                user1.address,
                await currentTime() + 100
            )
            mlog.log("------- after singleTokenAddLiquidity -------")
            mlog.log("user1 mat balance after : ", fromUnit(await mat.balanceOf(user1.address)))
            mlog.log("user1 mbt balance after : ", fromUnit(await mbt.balanceOf(user1.address)))
            mlog.log("user1 mat_mbt balance after : ", fromUnit(await mat_mbt.balanceOf(user1.address)))
            mlog.log("pair mat balance after  : ", fromUnit(await mat.balanceOf(mat_mbt.address)))
            mlog.log("pair mbt balance after  : ", fromUnit(await mbt.balanceOf(mat_mbt.address)))

            bnEqual(await mat.balanceOf(zapHelper.address), toUnit(0))
            bnEqual(await mat_mbt.balanceOf(zapHelper.address), toUnit(0))
        })
    })
})