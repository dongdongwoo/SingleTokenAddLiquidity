// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../interfaces/IUniswapV2Router.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IUniswapV2Factory.sol";

import "../libraries/SafeERC20.sol";

import "hardhat/console.sol";

contract ZapHelper is OwnableUpgradeable {
    using SafeERC20 for IERC20;

    IUniswapV2Router public ROUTER;
    IUniswapV2Factory public FACTORY;

    function initialize(address _router) public initializer {
        __Ownable_init();

        ROUTER = IUniswapV2Router(_router);
        FACTORY = IUniswapV2Factory(ROUTER.factory());
    }

    /// @notice 유동성 풀에 단일 토큰 예치를 지원하는 함수
    /// @param pair 예치하려는 대상 유동성 풀의 주소
    /// @param tokenA 예치에 사용할 단일 토큰의 주소
    /// @param singleAmount 예치에 사용할 단일 토큰의 예치 수량
    /// @param to LP 토큰을 수령할 사용자의 주소
    /// @param deadline 시간 제한을 둘 블록 타임스탬프
    function singleTokenAddLiquidity(
        IUniswapV2Pair pair,
        address tokenA,
        uint256 singleAmount,
        address to,
        uint256 deadline
    ) external {
        require(_isPair(address(pair)), "Zap: invalid pair address");
        require(IERC20(tokenA).balanceOf(msg.sender) >= singleAmount, "Efficient Amount");
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), singleAmount);

        _approveTokenIfNeeded(tokenA, address(ROUTER));
        address token0 = pair.token0();
        address token1 = pair.token1();

        if (tokenA == token0 || tokenA == token1) {
            address tokenB = tokenA == token0 ? token1 : token0;
            _approveTokenIfNeeded(tokenB, address(ROUTER));

            uint sellAmount = singleAmount / 2;
            uint tokenBAmount = _swap(tokenA, sellAmount, tokenB, address(this), deadline);

            ROUTER.addLiquidity(tokenA, tokenB, singleAmount - sellAmount, tokenBAmount, 0, 0, to, deadline);
        } else {
            revert();
        }

    }

    /* ========== PRIVATE FUNCTIONS ============= */

    function _swap(
        address from,
        uint amount,
        address to,
        address receiver,
        uint deadline
    ) private returns (uint) {
        address[] memory path;
        path = new address[](2);
        path[0] = from;
        path[1] = to;

        uint[] memory amounts = ROUTER.swapExactTokensForTokens(amount, 0, path, receiver, deadline);
        return amounts[amounts.length - 1];
    }

    function _approveTokenIfNeeded(address token, address to) private {
        if (IERC20(token).allowance(address(this), to) != type(uint256).max) {
            IERC20(token).safeApprove(to, type(uint256).max);
        }
    }

    function _isPair(address pair) internal view returns (bool result) {
        result = false;
        (bool success0, bytes memory data0) = address(pair).staticcall(abi.encode(bytes4(keccak256(bytes('token0()')))));
        (bool success1, bytes memory data1) = address(pair).staticcall(abi.encode(bytes4(keccak256(bytes('token1()')))));
        if (AddressUpgradeable.isContract(pair) && success0 && success1) {
            address token0 = abi.decode(data0, (address));
            address token1 = abi.decode(data1, (address));
            result = (FACTORY.getPair(token0, token1) == pair);
        }
    }
}
